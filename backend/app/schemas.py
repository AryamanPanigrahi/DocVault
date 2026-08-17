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

    class Config:
        from_attributes = True