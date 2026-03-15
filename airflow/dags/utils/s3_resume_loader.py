"""Fetch resume from S3 URL and extract plain text (PDF or .txt)."""
import io
import re
from urllib.parse import urlparse

import boto3
from pypdf import PdfReader

from utils.config import AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY


def _s3_client():
    kwargs = {"region_name": AWS_REGION}
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
    return boto3.client("s3", **kwargs)


def _parse_s3_url(url: str) -> tuple[str, str]:
    """Return (bucket, key) from s3://bucket/key or https://bucket.s3.region.amazonaws.com/key."""
    url = url.strip()
    if url.startswith("s3://"):
        parsed = urlparse(url)
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        return bucket, key
    if "s3." in url or ".s3." in url:
        parsed = urlparse(url)
        host = parsed.netloc
        if ".s3." in host:
            bucket = host.split(".s3.")[0]
        else:
            bucket = host.replace(".amazonaws.com", "").replace("s3-", "").split(".")[0]
        key = parsed.path.lstrip("/")
        return bucket, key
    raise ValueError(f"Unsupported S3 URL format: {url}")


def _pdf_to_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    text = "\n".join(parts)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def get_resume_text_from_s3(s3_url: str) -> str:
    """
    Download object from S3 and return plain text.
    Supports PDF and .txt (by extension); PDF is default if unclear.
    """
    bucket, key = _parse_s3_url(s3_url)
    client = _s3_client()
    response = client.get_object(Bucket=bucket, Key=key)
    data = response["Body"].read()
    key_lower = key.lower()
    if key_lower.endswith(".txt"):
        return data.decode("utf-8", errors="replace").strip()
    if key_lower.endswith(".pdf") or data[:4] == b"%PDF":
        return _pdf_to_text(data)
    # Default: try PDF, else treat as text
    try:
        return _pdf_to_text(data)
    except Exception:
        return data.decode("utf-8", errors="replace").strip()
