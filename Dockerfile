# 🐳 Dermalyze Backend - Multi-Runtime Dockerfile (Node + Python)

# 1. Base Image: Use Python 3.10 Slim for complex builds
FROM python:3.10-slim

# 2. Environment Variables
ENV NODE_ENV=production
ENV PORT=8080

# 3. Install System Dependencies (Build tools, OCR, and Image libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    pkg-config \
    curl \
    ca-certificates \
    # OCR Support
    tesseract-ocr \
    libtesseract-dev \
    tesseract-ocr-ara \
    tesseract-ocr-eng \
    # Image Dependencies
    libatlas-base-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# 4. Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 5. Set Working Directory
WORKDIR /app

# 6. Install Python Dependencies
# We install these before code to leverage Docker layer caching
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    dlib \
    face_recognition \
    pytesseract \
    pillow

# 7. Install Node.js Dependencies
COPY package*.json ./
RUN npm install --production

# 8. Copy Application Code
COPY . .

# 9. Expose Port
EXPOSE 8080

# 10. Start Server
CMD ["node", "server.js"]
