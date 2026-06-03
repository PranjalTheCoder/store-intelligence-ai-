# DATASET_ANALYSIS.md
# Brigade Road Store — 10 April 2026
# Filled from camera frame analysis

---

## Section 1: Store Identity

store_id:          ST1008
store_name:        Brigade_Bangalore
city:              Bangalore
date:              10-04-2026
operating_hours:   12:15 to 21:40 (from POS data)
total_pos_orders:  24
total_pos_items:   101
video_timestamp:   All cameras show ~20:10 in frames

---

## Section 2: Camera Assignments (CONFIRMED)

| Camera | Role                    | Usable for customers? | Notes |
|--------|-------------------------|-----------------------|-------|
| CAM1   | Main floor — skincare   | YES                   | High corner mount, back wall view |
| CAM2   | Main floor — makeup/wide| YES                   | Ceiling fisheye, full floor view  |
| CAM3   | Entry/Exit threshold    | YES — PRIMARY         | Top-down door camera              |
| CAM4   | Stockroom / Backroom    | NO — EXCLUDE          | Staff/inventory room only         |
| CAM5   | Billing / POS counter   | YES — BILLING ONLY    | Staff-side view of POS terminal   |

---

## Section 3: Camera Coverage Details

### CAM3 — Entry/Exit (PRIMARY COUNTING CAMERA)

Camera angle:       Top-down (nadir), directly above door
Entry line type:    HORIZONTAL (Y-axis threshold)
Entry line Y pixel: ~480 (at 1080p resolution — boundary between
                    dark granite mall floor and wooden store floor)
Door mat location:  Y = 450-510 approximately

Entry direction:    Centroid Y DECREASING (moving UP in frame = moving INTO store)
                    Person going from Y>500 to Y<450 = ENTRY
Exit direction:     Centroid Y INCREASING (moving DOWN in frame = moving OUT)
                    Person going from Y<450 to Y>500 = EXIT

Detection challenge: Top-down view — only heads visible, not full bodies
YOLO conf threshold: Use 0.20 (lower than default — top-down angle is unusual)
NMS threshold:      0.25 (lower — group entry with close-together heads)

### CAM1 — Skincare Zone Floor Camera

Camera angle:       High corner mount (~45 degrees), looking across back wall
Zones visible:      SKINCARE_WALL, BILLING_COUNTER (far right), FLOOR_AISLE
Staff visible:      Grey-shirt person at right = beauty advisor/staff
Cross-camera:       Overlaps with CAM2 at the billing counter area

### CAM2 — Makeup Zone + Wide Overview

Camera angle:       Ceiling fisheye from rear-left corner
Zones visible:      MAKEUP_WALL, CENTRAL_AISLE, BILLING_COUNTER (far left)
Entry direction:    Customers move right-to-left when entering from front door
Cross-camera:       Overlaps with CAM1 at billing counter (same person in both)

### CAM5 — Billing/POS Counter

Camera angle:       High mount behind counter, looking forward into aisle
Zones visible:      BILLING_COUNTER, ACCESSORIES (right wall), BACK_AISLE
Queue visible from: Aisle in front of counter (center-background of frame)
POS terminal:       Laptop visible on white counter — this is the exact billing point

### CAM4 — EXCLUDED

Reason:             Stockroom/backroom. No customers ever present.
Action:             Do not run customer detection on CAM4.
Documentation:      Note in CHOICES.md — any detection here is staff by definition.

---

## Section 4: Zone Registry (Confirmed)

| zone_id           | Camera(s)      | Location                    | Evidence                        |
|-------------------|----------------|-----------------------------|---------------------------------|
| ENTRY             | CAM3           | Front door threshold        | Glass door + door mat visible   |
| SKINCARE_WALL     | CAM1           | Back wall, full length      | FarmStay, TFShop, GoodVibes etc |
| MAKEUP_WALL       | CAM2           | Right wall                  | Alps, Lakme, FacesCanada, Mayb  |
| CENTRAL_AISLE     | CAM1, CAM2     | Mid-store between walls     | Gondola displays visible        |
| BILLING_COUNTER   | CAM1, CAM2, CAM5 | Back-left, white counter  | Purplle counter, POS laptop     |
| ACCESSORIES       | CAM5           | Right corner near billing   | ACCESSORIES digital sign        |

NOTE: Mens_Care and PB_ZONE from floor plan not clearly distinguishable
from camera angles. Map them to SKINCARE_WALL and MAKEUP_WALL broadly.
Refine after watching video for 10+ minutes.

---

## Section 5: Entry Line Calibration (CAM3)

Camera:     CAM3
Resolution: 1456 x 816 (from screenshot dimensions — confirm with ffprobe)
            Standard video: likely 1920x1080

Entry line: HORIZONTAL at Y ≈ 480 (in 1080p)
            Dark tile (mall) below this line
            Wood floor (store) above this line
            Door mat sits exactly at this boundary

Test procedure:
- Extract frame when person is mid-crossing
- Confirm centroid is near Y=480
- If centroid is above 480 and moving upward → count nothing (already inside)
- If centroid crosses from below 480 to above 480 → ENTRY
- If centroid crosses from above 480 to below 480 → EXIT

---

## Section 6: Staff Identification

From POS data, 5 staff members on duty:
  1. Zufishan Khazra  (42 items — highest volume)
  2. kasthuri v       (19 items)
  3. Priya v          (13 items)
  4. Shashikala .     (12 items)
  5. Naziya Begum     (8 items)

From camera frames:
  - Grey-shirt male/female visible in CAM1 (right, near billing) + CAM2 (far left)
    Clothing: PLAIN LIGHT GREY T-SHIRT — key visual identifier
  - Person in BLACK top visible at billing counter in CAM5
    Clothing: BLACK top — consistent with staff in retail

Staff detection strategy:
  Primary: Color-based (grey + black uniform detection)
  Secondary: Stationary behaviour near counter (staff stand still, customers walk)
  Tertiary: Zone-based (anyone appearing in CAM4 = staff automatically)

Staff vest HSV estimate (to fill after watching 5 minutes of video):
  Grey shirt: Hue=0-180, Saturation=0-40, Value=150-255 (any low-saturation colour)
  Black top: Value < 60

IMPORTANT CORRECTION TO PREVIOUS PLAN:
  Do not rely on "vest colour" alone — Purplle staff appear to wear
  BLACK or GREY casual clothing, not a distinctive vest.
  Strategy: Use low-saturation clothing + stationary-near-counter behaviour.

---

## Section 7: Camera Overlap Zones

CAM1 and CAM2 OVERLAP at: BILLING_COUNTER area
  - Grey-shirt person visible in CAM1 far-right AND CAM2 far-left
  - Same white counter with Purplle branding visible in both
  - Deduplication needed: Do not count a visitor in BILLING from both cameras

Deduplication strategy:
  - Assign BILLING zone events only from CAM5 (dedicated billing camera)
  - CAM1 and CAM2 cover SKINCARE and MAKEUP zones respectively
  - If person visible in both CAM1 and CAM2 simultaneously = use Re-ID matching
    to assign single visitor_id across cameras

---

## Section 8: Edge Cases to Watch For in Video

### Top-down entry counting (CAM3 specific):
  - Heads will appear small (~30-60px diameter at 1080p)
  - Groups entering together: heads may overlap or be very close (< 20px)
  - Person stops at door (deciding) — don't count as entry until they cross fully
  - Person looks in from outside (doesn't cross) — do NOT count as entry

### Billing area (CAM5 specific):
  - Staff is always present at counter — do not count as customer
  - Queue starts behind counter — count heads approaching from background
  - Customer who reaches counter then leaves without POS = BILLING_QUEUE_ABANDON

### Staff in customer zones (CAM1 + CAM2):
  - Staff walk through ALL zones (restocking, assisting customers)
  - Cannot rely on zone location alone to identify staff
  - Must use appearance vector from first classification

---

## Section 9: POS Correlation Mapping

Order times and expected camera activity:
  12:15:05 → busy opening — CAM3 should show multiple entries around this time
  19:21:55 → evening peak — largest single order (₹3,467 by Zufishan)
  21:39:55 → last transaction — store likely closing

Billing correlation window: 300 seconds (5 minutes)
  A visitor whose centroid enters BILLING zone (CAM5 front aisle)
  within 300 seconds before a POS timestamp = converted visitor.

---

## Section 10: config.py Values (Ready to Use)

STORE_ID           = "ST1008"
STORE_NAME         = "Brigade_Bangalore"

# Camera roles
ENTRY_CAMERA       = "CAM3"
BILLING_CAMERA     = "CAM5"
FLOOR_CAMERAS      = ["CAM1", "CAM2"]
EXCLUDED_CAMERAS   = ["CAM4"]  # stockroom — no customer detection

# Entry line for CAM3 (top-down, horizontal threshold)
ENTRY_LINE_Y       = 480  # pixels at 1080p — CONFIRM with ffprobe first
# Direction: centroid Y decreases = moving into store = ENTRY
ENTRY_DIRECTION    = "up"  # centroid moving toward lower Y value = ENTRY

# Detection thresholds
YOLO_MODEL         = "yolov8n.pt"
YOLO_CONF_CAM3     = 0.20   # lower for top-down view
YOLO_CONF_DEFAULT  = 0.25
NMS_THRESHOLD      = 0.25   # lower to handle group entry (close heads)

# Re-ID
REID_THRESHOLD     = 0.88

# Queue
QUEUE_SPIKE_THRESHOLD = 5
POS_CORRELATION_WINDOW_SEC = 300

# Staff detection
STAFF_DETECTION_STRATEGY = "colour_plus_zone"
STAFF_COLOUR_LOW_SAT_THRESHOLD = 50  # saturation < 50 = grey/black/white
STAFF_VALUE_BLACK_THRESHOLD = 80     # value < 80 = black clothing

# Zone IDs (exact strings to use in all events)
ZONE_IDS = [
    "ENTRY",           # threshold — not a dwell zone
    "SKINCARE_WALL",   # CAM1 coverage
    "MAKEUP_WALL",     # CAM2 right side
    "CENTRAL_AISLE",   # CAM1 + CAM2 mid-store
    "BILLING_COUNTER", # CAM1 right + CAM2 left + CAM5 dedicated
    "ACCESSORIES",     # CAM5 right wall
]

# Pixel polygons (FILL AFTER watching 10 minutes of CAM1 and CAM2)
# These are approximate — tune after running detect.py once
ZONE_POLYGONS = {
    "CAM1": {
        "SKINCARE_WALL":   [],  # entire left 80% of frame
        "BILLING_COUNTER": [],  # far right ~15% of frame
        "CENTRAL_AISLE":   [],  # floor area mid-frame
    },
    "CAM2": {
        "MAKEUP_WALL":     [],  # right side panels
        "CENTRAL_AISLE":   [],  # mid-floor
        "BILLING_COUNTER": [],  # far left
    },
    "CAM5": {
        "BILLING_COUNTER": [],  # foreground/left counter
        "BILLING_QUEUE":   [],  # aisle approaching counter
        "ACCESSORIES":     [],  # right side wall
    },
    "CAM3": {
        # No zones in CAM3 — only entry/exit line detection
    }
}