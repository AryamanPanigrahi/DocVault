from fastapi import FastAPI
from app import database

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "DocVault backend is alive"}
@app.get("/documents/{document_id}")
def get_document(document_id: int):
    return {"document_id": document_id, "status": "placeholder — no real data yet"}