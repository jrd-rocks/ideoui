import io
import zipfile
from typing import List

import boto3
from botocore.config import Config
from backend.config import get_r2_config

def get_s3_client():
    r2 = get_r2_config()
    
    if not r2["account_id"] or not r2["access_key_id"] or not r2["secret_access_key"] or not r2["bucket_name"]:
        raise ValueError("Cloudflare R2 configuration is missing credentials in ui/config/ui/config/config.toml.")
        
    endpoint_url = os.environ.get("S3_ENDPOINT_URL") or f"https://{r2['account_id']}.r2.cloudflarestorage.com"
    s3_client = boto3.client(
        service_name="s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=r2["access_key_id"],
        aws_secret_access_key=r2["secret_access_key"],
        region_name="auto",
        config=Config(signature_version="s3v4")
    )
    return s3_client, r2["bucket_name"], r2["public_url"]

def verify_r2_connectivity():
    """Checks Cloudflare R2 connectivity. Raises Exception if verification fails."""
    try:
        s3, bucket, _ = get_s3_client()
        # Test read permission by listing objects
        s3.list_objects_v2(Bucket=bucket, MaxKeys=1)
        print("[Storage] Cloudflare R2 connection verified successfully.")
    except Exception as e:
        print(f"[Storage] Critical Error: Cloudflare R2 verification failed: {e}")
        raise RuntimeError(f"Cloudflare R2 verification failed: {e}") from e

def upload_image(image_bytes: bytes, filename: str) -> str:
    """Uploads image bytes to Cloudflare R2 and returns its public access URL."""
    try:
        s3, bucket, public_url = get_s3_client()
        
        s3.put_object(
            Bucket=bucket,
            Key=filename,
            Body=image_bytes,
            ContentType="image/png"
        )
        
        if not public_url:
            r2 = get_r2_config()
            # Garage/Minio specific URL fallback if public_url isn't set, not perfectly reliable but a fallback.
            endpoint_url = os.environ.get("S3_ENDPOINT_URL") or f"https://{r2['account_id']}.r2.cloudflarestorage.com"
            # Return endpoint URL fallback
            return f"{endpoint_url}/{bucket}/{filename}"
            
        base_url = public_url.rstrip("/")
        return f"{base_url}/{filename}"
    except Exception as e:
        print(f"[Storage] Failed to upload image to Cloudflare R2: {e}")
        raise RuntimeError(f"R2 upload failed: {e}") from e


def upload_previews_zip(preview_b64_list: List[str], filename: str) -> str:
    """Zips base64-encoded preview JPEGs and uploads to R2. Returns public URL."""
    import base64
    try:
        s3, bucket, public_url = get_s3_client()

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for i, b64 in enumerate(preview_b64_list):
                zf.writestr(f"preview_{i:03d}.jpg", base64.b64decode(b64))
        buf.seek(0)

        s3.put_object(
            Bucket=bucket,
            Key=filename,
            Body=buf.read(),
            ContentType="application/zip"
        )

        if not public_url:
            r2 = get_r2_config()
            endpoint_url = os.environ.get("S3_ENDPOINT_URL") or f"https://{r2['account_id']}.r2.cloudflarestorage.com"
            return f"{endpoint_url}/{bucket}/{filename}"

        base_url = public_url.rstrip("/")
        return f"{base_url}/{filename}"
    except Exception as e:
        print(f"[Storage] Failed to upload previews zip to R2: {e}")
        raise RuntimeError(f"R2 upload failed: {e}") from e
