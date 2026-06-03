"""
correlate_pos.py — POS Correlation Engine (Phase 4)

Rules:
  • Load pos_transactions.csv (or the sample CSV which has a slightly
    different schema — handled transparently).
  • For each transaction, find visitor sessions where the visitor was
    in the billing zone within 5 minutes BEFORE the transaction timestamp.
  • Mark those sessions as converted=True and store transaction details.
  • Expose summary metrics: conversion_rate, converted_visitors,
    non_converted_visitors, average_basket_value.

Actual CSV schema from the sample data:
    order_id, order_date, order_time, store_id, product_id, brand_name, total_amount

Challenge schema:
    store_id, transaction_id, timestamp, basket_value_inr

Both are handled.
"""

from __future__ import annotations

import csv
import datetime
import os
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import sqlalchemy
from sqlalchemy.orm import Session as DBSession

from app.models import Event, Session as VisitorSession, POSTransaction


# ---------------------------------------------------------------------------
# CSV loader — handles both schemas
# ---------------------------------------------------------------------------

def load_pos_csv(csv_path: str) -> List[dict]:
    """
    Parse POS CSV.  Normalises both:
      • Challenge schema: store_id, transaction_id, timestamp, basket_value_inr
      • Sample schema:    order_id, order_date, order_time, store_id,
                          product_id, brand_name, total_amount
    Returns list of dicts with keys: transaction_id, store_id, timestamp (datetime), basket_value_inr
    """
    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Detect schema
            if "transaction_id" in row:
                # Challenge schema
                try:
                    ts = datetime.datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
                    ts = ts.replace(tzinfo=None)
                except Exception:
                    continue
                rows.append({
                    "transaction_id":   row["transaction_id"],
                    "store_id":         row["store_id"],
                    "timestamp":        ts,
                    "basket_value_inr": float(row.get("basket_value_inr", 0) or 0),
                })
            elif "order_id" in row:
                # Sample CSV schema — one row per product line item
                # group by (order_id, order_date, order_time, store_id)
                try:
                    date_str = row.get("order_date", "").strip()
                    time_str = row.get("order_time", "").strip()
                    dt_str   = f"{date_str} {time_str}"
                    ts = datetime.datetime.strptime(dt_str, "%d-%m-%Y %H:%M:%S")
                except Exception:
                    try:
                        ts = datetime.datetime.strptime(date_str, "%d-%m-%Y")
                    except Exception:
                        continue
                rows.append({
                    "transaction_id":   f"TXN_{row['order_id']}",
                    "store_id":         row["store_id"],
                    "timestamp":        ts,
                    "basket_value_inr": float(row.get("total_amount", 0) or 0),
                })

    # De-duplicate by transaction_id — sum basket values
    grouped: Dict[str, dict] = {}
    for r in rows:
        tid = r["transaction_id"]
        if tid not in grouped:
            grouped[tid] = r.copy()
        else:
            grouped[tid]["basket_value_inr"] += r["basket_value_inr"]

    return list(grouped.values())


# ---------------------------------------------------------------------------
# Correlation engine
# ---------------------------------------------------------------------------

class POSCorrelator:
    """
    Correlates POS transactions with visitor sessions.

    Usage:
        correlator = POSCorrelator(db_session)
        results = correlator.correlate(csv_path)
    """

    BILLING_ZONE_TYPES  = {"BILLING"}
    PRE_TXN_WINDOW_SEC  = 300   # 5 minutes

    def __init__(self, db: DBSession):
        self.db = db

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def correlate(self, csv_path: str) -> dict:
        """
        Full correlation run.

        Returns summary dict:
        {
          "total_transactions": int,
          "converted_visitors": int,
          "total_visitors":     int,
          "conversion_rate":    float (0-1),
          "average_basket_value": float,
          "total_revenue":      float,
        }
        """
        # 1. Load and persist POS records
        transactions = load_pos_csv(csv_path)
        self._persist_transactions(transactions)

        # 2. For each transaction, find matching billing-zone events
        converted_sessions = set()
        total_basket = 0.0
        matched = 0

        for txn in transactions:
            session_id = self._find_matching_session(txn)
            if session_id:
                self._mark_converted(session_id, txn)
                converted_sessions.add(session_id)
                total_basket += txn["basket_value_inr"]
                matched += 1

        # 3. Compute metrics
        total_customers = (
            self.db.query(VisitorSession)
            .filter(VisitorSession.is_staff == False)
            .count()
        )
        non_converted = total_customers - len(converted_sessions)

        return {
            "total_transactions":   len(transactions),
            "matched_transactions": matched,
            "converted_visitors":   len(converted_sessions),
            "non_converted_visitors": max(non_converted, 0),
            "total_visitors":       total_customers,
            "conversion_rate":      round(
                len(converted_sessions) / max(total_customers, 1), 4
            ),
            "average_basket_value": round(
                total_basket / max(matched, 1), 2
            ),
            "total_revenue":        round(total_basket, 2),
        }

    def get_metrics(self, store_id: Optional[str] = None) -> dict:
        """Return pre-computed metrics from DB (no re-run)."""
        q = self.db.query(VisitorSession).filter(VisitorSession.is_staff == False)
        if store_id:
            q = q.filter(VisitorSession.store_id == store_id)

        sessions = q.all()
        total = len(sessions)
        converted = [s for s in sessions if s.converted]
        baskets = [s.basket_value for s in converted if s.basket_value]

        return {
            "total_visitors":       total,
            "converted_visitors":   len(converted),
            "non_converted_visitors": total - len(converted),
            "conversion_rate":      round(len(converted) / max(total, 1), 4),
            "average_basket_value": round(sum(baskets) / max(len(baskets), 1), 2),
            "total_revenue":        round(sum(baskets), 2),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _persist_transactions(self, transactions: List[dict]):
        for txn in transactions:
            existing = self.db.get(POSTransaction, txn["transaction_id"])
            if not existing:
                record = POSTransaction(
                    transaction_id   = txn["transaction_id"],
                    store_id         = txn["store_id"],
                    timestamp        = txn["timestamp"],
                    basket_value_inr = txn["basket_value_inr"],
                )
                self.db.add(record)
        self.db.commit()

    def _find_matching_session(self, txn: dict) -> Optional[str]:
        """
        Find a visitor session where that visitor was in the billing zone
        within PRE_TXN_WINDOW_SEC before the transaction timestamp.
        """
        window_start = txn["timestamp"] - datetime.timedelta(seconds=self.PRE_TXN_WINDOW_SEC)
        window_end   = txn["timestamp"]

        # Look for billing-zone events in the window for this store
        billing_events = (
            self.db.query(Event)
            .filter(
                Event.store_id    == txn["store_id"],
                Event.event_type.in_(["ZONE_ENTER", "ZONE_DWELL", "BILLING_QUEUE_JOIN"]),
                Event.timestamp   >= window_start,
                Event.timestamp   <= window_end,
                Event.is_staff    == False,
            )
            .all()
        )

        # Filter to billing zone events
        billing_visitors = set()
        for ev in billing_events:
            zone_meta = ev.metadata_json or {}
            if (ev.zone_id and "BILLING" in (ev.zone_id or "").upper()) or \
               zone_meta.get("zone_type") == "BILLING" or \
               zone_meta.get("sku_zone") == "BILLING":
                billing_visitors.add(ev.visitor_id)

        if not billing_visitors:
            return None

        # Find the earliest session for those visitors in this store
        session = (
            self.db.query(VisitorSession)
            .filter(
                VisitorSession.store_id   == txn["store_id"],
                VisitorSession.visitor_id.in_(billing_visitors),
                VisitorSession.is_staff   == False,
            )
            .order_by(VisitorSession.entry_time.desc())
            .first()
        )

        return session.session_id if session else None

    def _mark_converted(self, session_id: str, txn: dict):
        session = self.db.get(VisitorSession, session_id)
        if session:
            session.converted      = True
            session.transaction_id = txn["transaction_id"]
            session.basket_value   = txn["basket_value_inr"]

        # Back-fill POSTransaction
        pos_rec = self.db.get(POSTransaction, txn["transaction_id"])
        if pos_rec:
            pos_rec.matched_session_id = session_id
            if session:
                pos_rec.matched_visitor_id = session.visitor_id

        self.db.commit()
