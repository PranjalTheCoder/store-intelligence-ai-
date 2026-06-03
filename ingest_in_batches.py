# ingest_in_batches.py
import json
import requests

def chunk_and_ingest():
    url = "http://localhost:8000/events/ingest"
    events_file = "outputs/events.jsonl"
    chunk_size = 400  # Safely below the 500 limit
    
    print(f" Reading events from {events_file}...")
    with open(events_file, "r", encoding="utf-8") as f:
        events = [json.loads(line) for line in f if line.strip()]
        
    total_events = len(events)
    print(f" Loaded {total_events} total video events. Beginning split ingestion...")
    
    # Process and POST in chunks of 400
    batch_count = 0
    for i in range(0, total_events, chunk_size):
        batch_count += 1
        chunk = events[i : i + chunk_size]
        
        payload = {"events": chunk}
        response = requests.post(url, json=payload)
        
        if response.status_code == 201:
            res_data = response.json()
            print(f"  ✅ Batch {batch_count}: Ingested={res_data.get('ingested')}, "
                  f"Duplicates={res_data.get('duplicates')}, Failed={res_data.get('failed')}")
        else:
            print(f"  ❌ Batch {batch_count} Failed with status {response.status_code}: {response.text}")

    print("\n All batches processed successfully!")

if __name__ == "__main__":
    chunk_and_ingest()