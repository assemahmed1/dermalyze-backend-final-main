# Dermalyze Backend Setup Guide

This guide will help you set up and run the Dermalyze backend on your machine.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **Python 3**: For face verification and identity check.
- **Tesseract OCR**: Required for reading text from ID cards.
- **MongoDB**: Either local installation or MongoDB Atlas.

---

## Step 1: Install System Dependencies (Mac)

Open your terminal and run the following commands to install Tesseract and Python libraries:

```bash
# 1. Install Tesseract OCR
brew install tesseract
brew install tesseract-lang

# 2. Install Python dependencies
pip3 install face_recognition pytesseract Pillow
```

---

## Step 2: Install Node.js Dependencies

In the project root directory, run:

```bash
npm install
```

---

## Step 3: Environment Variables

1. Copy the `.env.example` file to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your credentials (MongoDB, JWT Secret, Hugging Face Token, Cloudinary).

---

## Step 4: Run the Server

Start the development server:

```bash
npm run dev
```

---

## Identity Verification (Important)

The system uses Python scripts for identity verification. Ensure that `python3` is available in your PATH. The following endpoints require the Python setup:
- `POST /api/auth/verify-identity`

## AI Analysis

The AI analysis uses a specialized model hosted on Hugging Face. Ensure your `HF_API_TOKEN` has permission to access the inference API.
