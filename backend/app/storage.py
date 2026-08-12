import os
from dotenv import load_dotenv
from minio import Minio

load_dotenv()

MINIO_ROOT_USER = os.getenv("MINIO_ROOT_USER")
MINIO_ROOT_PASSWORD = os.getenv("MINIO_ROOT_PASSWORD")

minio_client = Minio(
    "localhost:9000",
    access_key=MINIO_ROOT_USER,
    secret_key=MINIO_ROOT_PASSWORD,
    secure=False,
)

BUCKET_NAME = "documents"


def ensure_bucket_exists():
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)