#!/usr/bin/env python3
"""
OCR script to verify doctor profession from ID back
Install: pip install pytesseract Pillow
"""

import sys
import json
from PIL import Image
import pytesseract

def check_doctor_on_id(image_path):
    try:
        img = Image.open(image_path)
        
        # Extract text from image using OCR
        text = pytesseract.image_to_string(img, lang="ara+eng")
        text_lower = text.lower()
        
        # Keywords to look for
        doctor_keywords = [
            "طبيب", "دكتور", "doctor", "physician",
            "md", "m.d", "dr.", "طب"
        ]
        
        found = any(keyword in text_lower for keyword in doctor_keywords)
        
        return {
            "isDoctor": found,
            "extractedText": text.strip(),
            "message": "Doctor profession verified" if found else "Could not verify doctor profession on ID"
        }

    except Exception as e:
        return {
            "isDoctor": False,
            "extractedText": "",
            "message": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"isDoctor": False, "message": "Invalid arguments"}))
        sys.exit(1)

    result = check_doctor_on_id(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
