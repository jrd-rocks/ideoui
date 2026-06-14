import sys
import os
import json

# Add ui/ directory to sys.path so we can import the backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import GenerationHistory
from backend.storage import get_s3_client

def restore_history():
    print("=========================================================")
    print("Starting history recovery from Cloudflare R2...")
    print("=========================================================")

    try:
        s3, bucket, _ = get_s3_client()
    except Exception as e:
        print(f"Error: Failed to initialize R2 client: {e}")
        return

    print(f"Scanning bucket '{bucket}' for metadata files under 'metadata/'...")

    metadata_keys = []
    try:
        paginator = s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix='metadata/')
        for page in pages:
            for obj in page.get('Contents', []):
                key = obj['Key']
                if key.endswith('.json'):
                    metadata_keys.append(key)
    except Exception as e:
        print(f"Error scanning R2: {e}")
        return

    print(f"Found {len(metadata_keys)} metadata file(s) in R2.")
    if not metadata_keys:
        print("No metadata backups to restore.")
        return

    restored_count = 0
    skipped_count = 0
    error_count = 0

    with SessionLocal() as db:
        for idx, key in enumerate(metadata_keys, 1):
            print(f"[{idx}/{len(metadata_keys)}] Processing {key}...", end=" ", flush=True)
            try:
                # Download JSON object
                response = s3.get_object(Bucket=bucket, Key=key)
                content = response['Body'].read().decode('utf-8')
                data = json.loads(content)

                uuid_val = data.get("uuid")
                timestamp_val = data.get("timestamp")

                if not uuid_val or not timestamp_val:
                    print("SKIPPED (Missing UUID or timestamp)")
                    skipped_count += 1
                    continue

                # Check if it already exists in DB
                existing = db.query(GenerationHistory).filter(GenerationHistory.uuid == uuid_val).first()
                if existing:
                    print("SKIPPED (Already exists in DB)")
                    skipped_count += 1
                    continue

                # Recreate the history record
                history_item = GenerationHistory(
                    timestamp=timestamp_val,
                    uuid=uuid_val,
                    parent_uuid=data.get("parent_uuid"),
                    raw_prompt=data.get("raw_prompt", ""),
                    upsampled_prompt=data.get("upsampled_prompt"),
                    images=data.get("images", []),
                    previews_url=data.get("previews_url"),
                    params=data.get("params", {})
                )
                db.add(history_item)
                db.commit()
                print("RESTORED")
                restored_count += 1

            except Exception as e:
                db.rollback()
                print(f"ERROR: {e}")
                error_count += 1

    print("=========================================================")
    print("Recovery Completed!")
    print(f"  Successfully Restored: {restored_count}")
    print(f"  Skipped (Duplicate/Invalid): {skipped_count}")
    print(f"  Failed with Errors: {error_count}")
    print("=========================================================")

if __name__ == "__main__":
    restore_history()
