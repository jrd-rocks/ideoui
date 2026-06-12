from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import GenerationHistory
from backend.schemas import HistoryItemCreate

router = APIRouter(prefix="/api/history", tags=["history"])

def history_item_to_dict(item: GenerationHistory):
    return {
        "id": item.id,
        "timestamp": item.timestamp,
        "uuid": item.uuid,
        "parentUuid": item.parent_uuid,
        "rawPrompt": item.raw_prompt,
        "upsampledPrompt": item.upsampled_prompt,
        "images": item.images,
        "params": item.params,
    }


@router.get("")
def read_history(db: Session = Depends(get_db)):
    db_items = db.query(GenerationHistory).order_by(GenerationHistory.timestamp.desc()).all()
    return [history_item_to_dict(item) for item in db_items]

@router.post("")
def create_history_item(item: HistoryItemCreate, db: Session = Depends(get_db)):
    # Check if entry already exists (with same uuid) to prevent duplicate syncing
    existing = db.query(GenerationHistory).filter(GenerationHistory.uuid == item.uuid).first()
    if existing:
        return history_item_to_dict(existing)

    # Intercept and convert any base64 images to S3/R2 URLs
    import re
    import base64
    import random
    from backend.storage import upload_image

    cleaned_images = []
    for idx, img in enumerate(item.images):
        if str(img).startswith("data:") or ";base64," in str(img):
            try:
                match = re.match(r"^data:image/\w+;base64,(.*)$", img)
                base64_data = match.group(1) if match else img
                img_bytes = base64.b64decode(base64_data)
                
                rand_id = random.randint(100000, 999999)
                filename = f"generations/{item.timestamp}_{rand_id}_{idx}.png"
                print(f"[History API] Uploading base64 image {idx+1}/{len(item.images)} to R2: {filename}")
                public_url = upload_image(img_bytes, filename)
                cleaned_images.append(public_url)
            except Exception as e:
                print(f"[History API] Failed to upload base64 image: {e}")
                cleaned_images.append(img)
        else:
            cleaned_images.append(img)

    db_item = GenerationHistory(
        timestamp=item.timestamp,
        uuid=item.uuid,
        parent_uuid=item.parentUuid,
        raw_prompt=item.rawPrompt,
        upsampled_prompt=item.upsampledPrompt,
        images=cleaned_images,
        params=item.params
    )
    db.add(db_item)
    try:
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database save failed: {e}")

    return history_item_to_dict(db_item)

@router.delete("/{timestamp}")
def delete_history_item_by_timestamp(timestamp: int, db: Session = Depends(get_db)):
    db_item = db.query(GenerationHistory).filter(GenerationHistory.timestamp == timestamp).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="History item not found")
    
    db.delete(db_item)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database deletion failed: {e}")
    return {"status": "success", "detail": f"Item with timestamp {timestamp} deleted"}

@router.delete("")
def clear_all_history(db: Session = Depends(get_db)):
    try:
        db.query(GenerationHistory).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database clear failed: {e}")
    return {"status": "success", "detail": "All history deleted"}
