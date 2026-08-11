from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app import database, models, schemas
from app.security import hash_password

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "DocVault backend is alive"}


@app.get("/documents/{document_id}")
def get_document(document_id: int):
    return {"document_id": document_id, "status": "placeholder — no real data yet"}


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