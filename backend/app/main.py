from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.security import get_current_user
from app import database, models, schemas
from app.security import hash_password
from app.storage import ensure_bucket_exists
from app.ocr import extract_text
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://doc-vault-jet-kappa.vercel.app",
        # The installed desktop app doesn't load from localhost:5173 like
        # `tauri dev` does — it loads bundled assets via Tauri's internal
        # protocol, whose origin is one of these depending on platform/
        # version convention. `tauri dev` already worked (matches the
        # localhost:5173 entry above), which is why this was missed until
        # testing the actual installed production build.
        "https://tauri.localhost",
        "tauri://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
from fastapi import UploadFile, File, Form
from app.storage import minio_client, BUCKET_NAME
import io

@app.post("/documents/upload", response_model=schemas.DocumentOut)
def upload_document(
    file: UploadFile = File(...),
    folder_id: int | None = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if folder_id is not None:
        _get_owned_folder(db, folder_id, current_user.id)

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

    try:
        new_document = models.Document(
            filename=file.filename,
            file_path=storage_key,
            content_type=file.content_type,
            size_bytes=file_size,
            owner_id=current_user.id,
            extracted_text=extracted_text,
            folder_id=folder_id,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
    except Exception:
        try:
            minio_client.remove_object(BUCKET_NAME, storage_key)
        except Exception as cleanup_error:
            print(f"Warning: failed to clean up orphaned file after DB error: {cleanup_error}")
        raise HTTPException(status_code=500, detail="Upload failed, please try again")

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
        .filter(models.Document.deleted_at.is_(None))
        .filter(
            models.Document.extracted_text.ilike(f"%{q}%")
            | models.Document.filename.ilike(f"%{q}%")
        )
        .all()
    )
    return results

@app.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get("/documents", response_model=list[schemas.DocumentOut])
def list_documents(
    folder_id: int | None = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Folder-scoped, not global: omitting folder_id means "root" (documents
    # with no folder), not "everything everywhere" — a folder view should
    # only show its own direct contents, same as any real file browser.
    return (
        db.query(models.Document)
        .filter(models.Document.owner_id == current_user.id)
        .filter(models.Document.deleted_at.is_(None))
        .filter(models.Document.folder_id == folder_id)
        .all()
    )
def _get_owned_folder(db: Session, folder_id: int, user_id: int) -> models.Folder:
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return folder


@app.get("/folders", response_model=list[schemas.FolderOut])
def list_folders(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Flat list, not a tree — the frontend assembles hierarchy from
    # parent_id, same pattern as returning flat documents and letting the
    # client sort/group them.
    return db.query(models.Folder).filter(models.Folder.owner_id == current_user.id).all()


@app.post("/folders", response_model=schemas.FolderOut)
def create_folder(
    folder: schemas.FolderCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if folder.parent_id is not None:
        _get_owned_folder(db, folder.parent_id, current_user.id)

    new_folder = models.Folder(
        name=folder.name,
        parent_id=folder.parent_id,
        owner_id=current_user.id,
        auto_keywords=folder.auto_keywords,
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder


@app.patch("/folders/{folder_id}", response_model=schemas.FolderOut)
def update_folder(
    folder_id: int,
    update: schemas.FolderUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    folder = _get_owned_folder(db, folder_id, current_user.id)

    if update.parent_id is not None:
        if update.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="A folder cannot be its own parent")
        _get_owned_folder(db, update.parent_id, current_user.id)

    if update.name is not None:
        folder.name = update.name
    if "parent_id" in update.model_fields_set:
        folder.parent_id = update.parent_id
    if "auto_keywords" in update.model_fields_set:
        folder.auto_keywords = update.auto_keywords

    db.commit()
    db.refresh(folder)
    return folder


@app.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    folder = _get_owned_folder(db, folder_id, current_user.id)

    # Deleting a folder never touches what's inside it — documents and
    # subfolders both move to root (folder_id/parent_id = None) rather
    # than being cascade-deleted or blocking the delete.
    db.query(models.Document).filter(models.Document.folder_id == folder_id).update(
        {"folder_id": None}
    )
    db.query(models.Folder).filter(models.Folder.parent_id == folder_id).update(
        {"parent_id": None}
    )

    db.delete(folder)
    db.commit()
    return {"detail": "Folder deleted, contents moved to root"}


@app.post("/documents/{document_id}/move", response_model=schemas.DocumentOut)
def move_document(
    document_id: int,
    move: schemas.MoveDocumentRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = (
        db.query(models.Document)
        .filter(models.Document.id == document_id)
        .filter(models.Document.deleted_at.is_(None))
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if move.folder_id is not None:
        _get_owned_folder(db, move.folder_id, current_user.id)

    document.folder_id = move.folder_id
    db.commit()
    db.refresh(document)
    return document


@app.get("/documents/trash", response_model=list[schemas.DocumentOut])
def list_trash(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Document)
        .filter(models.Document.owner_id == current_user.id)
        .filter(models.Document.deleted_at.is_not(None))
        .all()
    )
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
    document = (
        db.query(models.Document)
        .filter(models.Document.id == document_id)
        .filter(models.Document.deleted_at.is_(None))
        .first()
    )

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



@app.post("/documents/{document_id}/restore")
def restore_document(
    document_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    document.deleted_at = None
    db.commit()
    return {"detail": "Document restored"}


@app.delete("/documents/{document_id}/permanent")
def permanently_delete_document(
    document_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        minio_client.remove_object(BUCKET_NAME, document.file_path)
    except Exception as e:
        print(f"Warning: could not remove file from MinIO (may already be missing): {e}")

    db.delete(document)
    db.commit()
    return {"detail": "Document permanently deleted"}


@app.delete("/documents/{document_id}")

def delete_document(
    document_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    document.deleted_at = func.now()
    db.commit()
    return {"detail": "Document moved to trash"}