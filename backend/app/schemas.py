from pydantic import BaseModel
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    filename: str
    content_type: str | None
    size_bytes: int | None
    uploaded_at: datetime
    extracted_text: str | None
    folder_id: int | None

    class Config:
        from_attributes = True


class FolderCreate(BaseModel):
    name: str
    parent_id: int | None = None
    auto_keywords: str | None = None  # comma-separated


class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    auto_keywords: str | None = None


class FolderOut(BaseModel):
    id: int
    name: str
    parent_id: int | None
    auto_keywords: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MoveDocumentRequest(BaseModel):
    folder_id: int | None  # null moves the document back to root