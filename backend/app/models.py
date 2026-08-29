from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # Self-referential: null parent_id means a top-level folder. Arbitrary
    # nesting depth is just repeated parent_id lookups, no depth limit
    # enforced at the schema level.
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # A folder can auto-collect documents whose filename/OCR text matches
    # any of its keywords (case-insensitive substring, same mechanism as
    # the existing notes/assignments classifier) — user-defined rules,
    # separate from the handful of built-in default classifiers.
    auto_keywords = Column(String, nullable=True)  # comma-separated


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    extracted_text = Column(String, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    # Null means the document lives at the root, not inside any folder.
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)