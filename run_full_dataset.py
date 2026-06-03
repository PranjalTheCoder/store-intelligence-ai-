# run_full_dataset.py
import os
import sys
import subprocess
import time

def run_cmd(description, cmd):
    print(f"\n======== Running: {description} ========")
    print(f"Command: {' '.join(cmd)}")
    start = time.time()
    # Change capture_code=True to capture_output=True
    result = subprocess.run(cmd, capture_output=True, text=True) 
    duration = time.time() - start
    
    if result.returncode == 0:
        print(f"✅ Success ({duration:.2f}s)")
        if result.stdout:
            # Print the final confirmation logs
            print("\n".join(result.stdout.strip().split('\n')[-3:])) 
    else:
        print(f"❌ Failed ({duration:.2f}s)")
        if result.stderr:
            print(result.stderr)
        if result.stdout:
            print(result.stdout)
    return result.returncode == 0

def main():
    # 1. Reset Staging Environment DB
    print("[Dataset Automation] Resetting analytics SQLite storage database...")
    if os.path.exists("data/store_intelligence.db"):
        try:
            os.remove("data/store_intelligence.db")
        except Exception as e:
            print(f"Could not remove DB file, continuing: {e}")
            
    # Clear output files
    if os.path.exists("outputs/events.jsonl"):
        open("outputs/events.jsonl", "w").close()

    # Initialize blank database schemas
    subprocess.run([sys.executable, "-c", "from app.database import init_db; init_db()"])

    # 2. Store 1 Tracking (4 Cameras)
    store1_cmd = [
        sys.executable, "run_detection.py",
        "--store", "STORE_1",
        "--videos",
        "CAM3:resources/Store1/CAM 3 - entry.mp4",
        "CAM1:resources/Store1/CAM 1 - zone.mp4",
        "CAM2:resources/Store1/CAM 2 - zone.mp4",
        "CAM5:resources/Store1/CAM 5 - billing.mp4"
    ]
    s1_ok = run_cmd("STORE_1 Batch Processing (4 CCTV Cameras)", store1_cmd)

    # 3. Store 2 Tracking (4 Cameras)
    store2_cmd = [
        sys.executable, "run_detection.py",
        "--store", "STORE_2",
        "--videos",
        "entry1:resources/Store2/entry 1.mp4",
        "entry2:resources/Store2/entry2.mp4",
        "zone:resources/Store2/zone.mp4",
        "billing:resources/Store2/billing_area.mp4"
    ]
    s2_ok = run_cmd("STORE_2 Batch Processing (4 CCTV Cameras)", store2_cmd)

    print("\n============================================================")
    print("  Dataset Processing Complete Summary")
    print(f"  STORE_1 Pipeline: {'PASS ✅' if s1_ok else 'FAIL ❌'}")
    print(f"  STORE_2 Pipeline: {'PASS ✅' if s2_ok else 'FAIL ❌'}")
    print("============================================================\n")
    print("[Dataset Automation] Compiling all video events into batch JSON payload...")
    try:
        import json
        events_file = "outputs/events.jsonl"
        batch_file = "outputs/normalized_events.json"
        
        if os.path.exists(events_file):
            with open(events_file, "r", encoding="utf-8") as f:
                records = [json.loads(line) for line in f if line.strip()]
            with open(batch_file, "w", encoding="utf-8") as f:
                json.dump({"events": records}, f, indent=2)
            print(f"✅ Created fresh batch payload with {len(records)} events.")
    except Exception as e:
        print(f"⚠️ Could not build batch file: {e}")

if __name__ == "__main__":
    main()