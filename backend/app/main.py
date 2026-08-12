from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.security import get_current_user
from app import database, models, schemas
from app.security import hash_password
from app.storage import ensure_bucket_exists

app = FastAPI()
@app.on_event("startup")
def startup_event():
    ensure_bucket_exists()

@app.get("/")
def read_root():
    return {"message": "DocVault backend is alive"}


@app.get("/documents/{document_id}")
def get_document(document_id: int, current_user: models.User = Depends(get_current_user)):
    return {
        "document_id": document_id,
        "requested_by": current_user.email,
        "status": "placeholder — no real data yet",
    }


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