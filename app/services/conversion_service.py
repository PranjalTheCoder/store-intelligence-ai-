"""
conversion_service.py — POS correlation service.

Loads pos_transactions.csv (either schema), then for every transaction:
  Find visitor sessions where the visitor was in the billing zone
  within 5 minutes BEFORE the transaction timestamp AND same store_id.
  Mark session.converted = True and store basket_value.

Schema supported:
  Challenge: store_id, transaction_id, timestamp, basket_value_inr
  Sample:    order_id, order_date, order_time, store_id, product_id, brand_name, total_amount
"""

from __future__ import annotations

import csv
import datetime
import os
from pathlib import Path
from typing import List, Optional, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession, POSTransaction

BILLING_WINDOW_SEC = 300   # 5 minutes
BILLING_EVENT_TYPES = {"BILLING_QUEUE_JOIN", "ZONE_ENTER", "ZONE_DWELL"}
BILLING_ZONE_KEYWORDS = {"billing", "cash", "counter", "queue"}


def _is_billing_zone(zone_id: Optional[str], metadata: Optional[dict]) -> bool:
    if not zone_id:
        return False
    zone_lower = zone_id.lower()
    if any(k in zone_lower for k in BILLING_ZONE_KEYWORDS):
        return True
    if metadata:
        sku = (metadata.get("sku_zone") or "").lower()
        zt  = (metadata.get("zone_type") or "").lower()
        if "billing" in sku or "billing" in zt:
            return True
    return False


def load_pos_csv(csv_path: str) -> List[dict]:
    """Parse POS CSV — handles both schemas. Returns normalised dicts."""
    rows: List[dict] = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                if "transaction_id" in row:
                    ts_str = row["timestamp"].replace("Z", "").replace("+00:00", "")
                    ts = datetime.datetime.fromisoformat(ts_str)
                    rows.append({
                        "transaction_id":   row["transaction_id"].strip(),
                        "store_id":         row["store_id"].strip(),
                        "timestamp":        ts,
                        "basket_value_inr": float(row.get("basket_value_inr") or 0),
                    })
                elif "order_id" in row:
                    date_str = row.get("order_date", "").strip()
                    time_str = row.get("order_time", "").strip()
                    ts = datetime.datetime.strptime(f"{date_str} {time_str}", "%d-%m-%Y %H:%M:%S")
                    rows.append({
                        "transaction_id":   f"TXN_{row['order_id'].strip()}",
                        "store_id":         row["store_id"].strip(),
                        "timestamp":        ts,
                        "basket_value_inr": float(row.get("total_amount") or 0),
                    })
            except Exception:
                continue   # skip malformed rows silently

    # Merge line items by transaction_id (sum basket values)
    merged: Dict[str, dict] = {}
    for r in rows:
        tid = r["transaction_id"]
        if tid not in merged:
            merged[tid] = r.copy()
        else:
            merged[tid]["basket_value_inr"] += r["basket_value_inr"]

    return list(merged.values())


class ConversionService:
    """
    Full POS correlation service.
    Safe to call multiple times — idempotent via transaction_id PK.
    """

    def __init__(self, db: DBSession):
        self.db = db

    def run(self, csv_path: str) -> dict:
        """
        Load CSV, correlate, persist.
        Returns summary metrics.
        """
        if not Path(csv_path).exists():
            return {"error": f"CSV not found: {csv_path}"}

        transactions = load_pos_csv(csv_path)
        self._persist_transactions(transactions)

        matched      = 0
        total_basket = 0.0
        converted_sessions: set = set()

        for txn in transactions:
            session_id = self._find_matching_session(txn)
            if session_id and session_id not in converted_sessions:
                self._mark_converted(session_id, txn)
                converted_sessions.add(session_id)
                total_basket += txn["basket_value_inr"]
                matched += 1

        total_customer_sessions = (
            self.db.query(func.count(VisitorSession.session_id))
            .filter(VisitorSession.is_staff == False)
            .scalar()
        ) or 0

        return {
            "total_transactions":     len(transactions),
            "matched_transactions":   matched,
            "converted_sessions":     len(converted_sessions),
            "total_customer_sessions": total_customer_sessions,
            "conversion_rate":        round(
                len(converted_sessions) / max(total_customer_sessions, 1) * 100, 2
            ),
            "total_revenue":          round(total_basket, 2),
            "avg_basket_value":       round(total_basket / max(matched, 1), 2),
        }

    def get_metrics(self, store_id: Optional[str] = None) -> dict:
        q = self.db.query(VisitorSession).filter(VisitorSession.is_staff == False)
        if store_id:
            q = q.filter(VisitorSession.store_id == store_id)
        sessions  = q.all()
        total     = len(sessions)
        converted = [s for s in sessions if s.converted]
        baskets   = [s.basket_value for s in converted if s.basket_value]
        return {
            "total_visitors":        total,
            "converted_visitors":    len(converted),
            "non_converted_visitors": total - len(converted),
            "conversion_rate":       round(len(converted) / max(total, 1) * 100, 2),
            "average_basket_value":  round(sum(baskets) / max(len(baskets), 1), 2),
            "total_revenue":         round(sum(baskets), 2),
        }

    # ── Private ──────────────────────────────────────────────────────────

    def _find_matching_session(self, txn: dict) -> Optional[str]:
        window_start = txn["timestamp"] - datetime.timedelta(seconds=BILLING_WINDOW_SEC)
        window_end   = txn["timestamp"]

        # Find billing-zone events in the 5-min window for this store
        billing_events = (
            self.db.query(Event)
            .filter(
                Event.store_id  == txn["store_id"],
                Event.is_staff  == False,
                Event.timestamp >= window_start,
                Event.timestamp <= window_end,
                Event.event_type.in_(list(BILLING_EVENT_TYPES)),
            )
            .all()
        )

        billing_visitors = set()
        for ev in billing_events:
            if (ev.event_type == "BILLING_QUEUE_JOIN" or
                    _is_billing_zone(ev.zone_id, ev.metadata_json)):
                billing_visitors.add(ev.visitor_id)

        if not billing_visitors:
            return None

        # Find most recent unconverted session for these visitors
        session = (
            self.db.query(VisitorSession)
            .filter(
                VisitorSession.store_id   == txn["store_id"],
                VisitorSession.visitor_id.in_(billing_visitors),
                VisitorSession.is_staff   == False,
                VisitorSession.converted  == False,
            )
            .order_by(VisitorSession.entry_time.desc())
            .first()
        )
        return session.session_id if session else None

    def _persist_transactions(self, transactions: List[dict]):
        for txn in transactions:
            existing = self.db.get(POSTransaction, txn["transaction_id"])
            if not existing:
                self.db.add(POSTransaction(
                    transaction_id   = txn["transaction_id"],
                    store_id         = txn["store_id"],
                    timestamp        = txn["timestamp"],
                    basket_value_inr = txn["basket_value_inr"],
                ))
        self.db.commit()

    def _mark_converted(self, session_id: str, txn: dict):
        sess = self.db.get(VisitorSession, session_id)
        if sess:
            sess.converted      = True
            sess.transaction_id = txn["transaction_id"]
            sess.basket_value   = txn["basket_value_inr"]
        pos = self.db.get(POSTransaction, txn["transaction_id"])
        if pos:
            if sess:
                pos.matched_visitor_id = sess.visitor_id
            pos.matched_session_id = session_id
        self.db.commit()
