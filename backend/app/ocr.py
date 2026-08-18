import io
import os
import pytesseract
from PIL import Image
import fitz

if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    full_text = ""

    for page in pdf:
        page_text = page.get_text()
        if page_text.strip():
            full_text += page_text
        else:
            pix = page.get_pixmap()
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            full_text += pytesseract.image_to_string(image)

    pdf.close()
    return full_text


def extract_text(file_bytes: bytes, content_type: str) -> str | None:
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif content_type and content_type.startswith("image/"):
        return extract_text_from_image(file_bytes)
    else:
        return None