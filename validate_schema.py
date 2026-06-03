import json
import uuid
import sys

def validate(file_path):
    required_keys = {"event_id", "store_id", "camera_id", "visitor_id", "event_type", 
                     "timestamp", "zone_id", "dwell_ms", "is_staff", "confidence", "metadata"}
    required_metadata = {"queue_depth", "sku_zone", "session_seq"}
    
    errors = 0
    with open(file_path, 'r') as f:
        for i, line in enumerate(f):
            event = json.loads(line)
            
            # 1. Check all top-level keys exist
            missing = required_keys - set(event.keys())
            if missing:
                print(f"Line {i+1} missing keys: {missing}")
                errors += 1
                
            # 2. Check metadata keys exist
            meta_missing = required_metadata - set(event.get("metadata", {}).keys())
            if meta_missing:
                print(f"Line {i+1} metadata missing keys: {meta_missing}")
                errors += 1
                
            # 3. Validate UUID format
            try:
                uuid.UUID(str(event.get("event_id")))
            except ValueError:
                print(f"Line {i+1} invalid UUID: {event.get('event_id')}")
                errors += 1

    if errors == 0:
        print("✅ All events pass structural validation!")
    else:
        print(f"❌ Found {errors} schema errors.")

if __name__ == "__main__":
    validate("outputs/events.jsonl")