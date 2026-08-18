import os
from dotenv import load_dotenv
from minio import Minio

load_dotenv()

STORAGE_ACCESS_KEY = os.getenv("B2_KEY_ID") or os.getenv("MINIO_ROOT_USER")
STORAGE_SECRET_KEY = os.getenv("B2_APPLICATION_KEY") or os.getenv("MINIO_ROOT_PASSWORD")
STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "localhost:9000")
STORAGE_SECURE = os.getenv("STORAGE_SECURE", "false").lower() == "true"

minio_client = Minio(
    STORAGE_ENDPOINT,
    access_key=STORAGE_ACCESS_KEY,
    secret_key=STORAGE_SECRET_KEY,
    secure=STORAGE_SECURE,
)

BUCKET_NAME = os.getenv("BUCKET_NAME", "documents")


def ensure_bucket_exists():
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)