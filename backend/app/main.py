from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.security import get_current_user
from app import database, models, schemas
from app.security import hash_password
from app.storage import ensure_bucket_exists
from app.ocr import extract_text

app = FastAPI()
@app.on_event("startup")
def startup_event():
    ensure_bucket_exists()

@app.get("/")
def read_root():
    return {"message": "DocVault backend is alive"}

@app.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
from fastapi.security import OAuth2PasswordRequestForm
from app.security import hash_password, verify_password, create_access_token


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


import uuid
from fastapi import UploadFile, File
from app.storage import minio_client, BUCKET_NAME
import io

@app.post("/documents/upload", response_model=schemas.DocumentOut)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    file_bytes = file.file.read()
    file_size = len(file_bytes)
    extracted_text = extract_text(file_bytes, file.content_type)
    storage_key = f"{uuid.uuid4()}_{file.filename}"

    minio_client.put_object(
        BUCKET_NAME,
        storage_key,
        data=io.BytesIO(file_bytes),
        length=file_size,
        content_type=file.content_type,
    )

    new_document = models.Document(
    filename=file.filename,
    file_path=storage_key,
    content_type=file.content_type,
    size_bytes=file_size,
    owner_id=current_user.id,
    extracted_text=extracted_text,
)
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    return new_document

@app.get("/documents/search", response_model=list[schemas.DocumentOut])
def search_documents(
    q: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    results = (
        db.query(models.Document)
        .filter(models.Document.owner_id == current_user.id)
        .filter(
            models.Document.extracted_text.ilike(f"%{q}%")
            | models.Document.filename.ilike(f"%{q}%")
        )
        .all()
    )
    return results

@app.get("/documents/{document_id}")
def get_document(document_id: int, current_user: models.User = Depends(get_current_user)):
    return {
        "document_id": document_id,
        "requested_by": current_user.email,
        "status": "placeholder — no real data yet",
    }

from fastapi.responses import StreamingResponse

@app.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    minio_response = minio_client.get_object(BUCKET_NAME, document.file_path)

    return StreamingResponse(
        minio_response,
        media_type=document.content_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )
