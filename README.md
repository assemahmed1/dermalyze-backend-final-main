# 🩺 Dermalyze Backend

Dermalyze is a state-of-the-art, high-security clinical portal and dermatological workspace designed to empower doctors and patients with advanced skin-health tracking. The backend is a robust Node.js and Express.js application designed to handle patient management, real-time consultation, intelligent face verification, and AI-powered skin lesion analysis.

By combining modern Web APIs, machine learning pipelines, and relational database management, Dermalyze offers an end-to-end medical software solution where safety, reliability, and security are paramount.

---

## 🚀 Tech Stack

Dermalyze leverages a hybrid stack of modern Javascript and Python technologies to deliver real-time performance, secure data persistence, and heavy-lifting machine learning capabilities:

### Core Frameworks & Runtime
*   **Runtime:** Node.js (v18+)
*   **Web Framework:** Express.js (v5.2.1) — Utilizing high-performance, modern routing mechanics.
*   **Real-time Communication:** Socket.io (v4.8.3) for instant, bi-directional doctor-patient chat.

### Database & Data Persistence
*   **Database:** MySQL (v8.0+)
*   **ORM:** Sequelize (v6.37.8) with the `mysql2` driver — Fully relational, structured database schema featuring strict cascading deletion rules and foreign-key constraints.

### Artificial Intelligence & Machine Learning
*   **Skin Cancer Image Classification:** Hugging Face Inference API querying the fine-tuned model [Anwarkh1/Skin_Cancer-Image_Classification](https://huggingface.co/Anwarkh1/Skin_Cancer-Image_Classification) in real-time.
*   **Image Comparison & Severity Metrics:** Local Python child process executing a custom morphological inference pipeline (`scripts/inference.py`) to calculate structural severity scores and calculate comparative recovery percentages.
*   **Face Matching & Professional Verification:** Python-based computer vision routines utilizing `face_recognition` and Tesseract OCR to automatically match selfie photos to official medical ID cards and scan credentials for professional keywords.

### Integrations & Services
*   **Cloud Storage:** Cloudinary SDK (v2.5.1) for secure, transformation-enabled cloud media uploads.
*   **Encyclopedia Lookup:** Google Sheets API (`googleapis` v171.4.0) to query a shared cloud-based medications database.
*   **Transactional Emails:** Resend API (v6.12.0) to send OTP codes and registration updates.

### Hardened Security
*   **Authentication:** JSON Web Tokens (JWT) with secure signing keys.
*   **Two-Factor Authentication (2FA):** Time-based One-Time Password (TOTP) utilizing `speakeasy` and custom dynamic `qrcode` generation.
*   **Headers & Sanitization:** `helmet` for HTTP header security and `xss-clean` for input sanitization against Cross-Site Scripting.
*   **Validation:** Strict payload schemas utilizing `express-validator`.

---

## ✨ Main Features

### 👤 Role-Based Portals & Sign-Up
*   **Doctor Sign-Up Pipeline:** Doctors submit professional medical IDs (Front/Back) and a selfie. The backend initiates a local Python pipeline that checks the face match (selfie vs. ID) and scans the ID back for credentials using OCR. Once an admin approves the doctor, they are assigned a unique, shareable `doctorCode`.
*   **Patient Registration & Linking:** Patients register and link themselves to their respective dermatologist using their unique `doctorCode`.

### 🧠 Advanced AI & Image Analytics
*   **Real-Time Skin Lesion Analysis:** Upload a skin lesion photo to instantaneously query the Hugging Face AI pipeline and obtain diagnostic classifications (e.g. Melanoma, Psoriasis, Eczema) with detailed confidence scores.
*   **Morphological Severity Comparisons:** Upload two consecutive visit images to compare progress. The backend triggers a Python process that analyzes lesion boundaries, returning severity metrics and calculating an improvement/worsening percentage.

### 📊 Smart History & Medical Analytics
*   **Aggregated Analytics:** Doctors can query custom aggregated data for specific skin conditions (e.g., Eczema). The system joins `Medications` and `Patients` to calculate the average recovery rate and total dosage ratings, allowing doctors to identify the most effective treatments in their practice.

### 💬 Seamless Collaboration & Workspace
*   **Clinical CRM:** Add patients, update clinical status (Improving, Stable, Critical), track recovery progress (0–100%), and maintain an chronological timeline of review notes.
*   **Interactive Prescriptions & Guides:** Write, edit, and delete patient prescriptions. Retrieve or search clinical drugs directly from an integrated Google Sheet encyclopedia.
*   **Clinic Appointments Scheduler:** Schedule appointments, update clinical status (Scheduled, Completed, Cancelled), and organize calendars.
*   **Real-Time Chat:** Exchange instant messages with active patients via WebSockets.

---

## 🔑 Environment Variables

To run the application, create a `.env` file in the root directory by duplicating `.env.example`:

```bash
cp .env.example .env
```

Ensure the following variables are configured:

| Environment Variable | Description |
| :--- | :--- |
| `PORT` | Local port for server execution (Default: `5050`) |
| `MYSQL_URL` / `DATABASE_URL` | Public MySQL connection URL (Preferred for platforms like Railway) |
| `MYSQL_HOST` | Fallback MySQL host (e.g., `localhost`) |
| `MYSQL_PORT` | Fallback MySQL port (e.g., `3306`) |
| `MYSQL_USER` | Fallback MySQL username |
| `MYSQL_PASSWORD` | Fallback MySQL password |
| `MYSQL_DATABASE` | Fallback MySQL database name |
| `JWT_SECRET` | Secret key for signing and verifying JWTs |
| `HF_API_TOKEN` | Hugging Face Hub Access Token for AI inference |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud name for image storage |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret Key |
| `NODE_ENV` | Running environment (`development` or `production`) |
| `FRONTEND_URL` | Allowed origin for CORS and frontend redirects |
| `RESEND_API_KEY` | API Key for sending emails via Resend |
| `RESEND_FROM_EMAIL` | Sender address for transactional emails |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Stringified JSON credentials for Google Sheets Service Account |
| `GOOGLE_SHEET_ID` | Google Sheet ID containing the medications guide |
| `ADMIN_EMAIL` | Default administrator email for administrative commands |
| `ADMIN_PASSWORD` | Default administrator password |
| `ADMIN_NAME` | Default administrator display name |

---

## 🛠️ Installation & Setup

Follow these steps to set up and run the Dermalyze backend locally:

### 1. Install System Dependencies
Ensure you have **Node.js (v18+)**, **MySQL**, and **Python 3** installed. On macOS, install Tesseract OCR (required for medical license checks):

```bash
# Install Tesseract OCR via Homebrew
brew install tesseract
brew install tesseract-lang
```

*For Linux (Ubuntu/Debian) platforms:*
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-all
```

### 2. Install Project Dependencies
In the project root folder, install the Node.js modules and Python AI requirements:

```bash
# Install Node.js packages
npm install

# Install Python ML/CV libraries
pip3 install face_recognition pytesseract Pillow
```

### 3. Download Face Recognition Models
Dermalyze uses pre-trained weights for face-detection. Run the downloader script to pull the weights locally:

```bash
npm run download-models
```
*This downloads SSD MobileNet and Landmark models to `models/face/`.*

### 4. Database Seeding & Administration
Initialize the MySQL database schemas and seed the clinical resource libraries:

```bash
# Seed the core clinical diseases dataset
node scripts/seedDiseases.js

# Seed the medications encyclopedia and disease resource tables
node scripts/seedResources.js

# Bootstrap the default administrator account
npm run create-admin
```

### 5. Launch the Application
Start the server in development mode (utilizes `nodemon` for auto-reloading):

```bash
npm run dev
```

The server will run on `http://localhost:5050`.
Access the interactive **Swagger API Documentation** at: `http://localhost:5050/api-docs`.

---

## 📡 API Endpoints

Below is a detailed reference of the API endpoints available in the Dermalyze backend.

> [!NOTE]
> All protected routes require a `Bearer <JWT_TOKEN>` in the `Authorization` header.

<details>
<summary>🔑 Authentication & Verification</summary>

### Public Routes
*   `POST /api/auth/register` - Registers a new user. Doctors must upload `idCardFront`, `idCardBack`, and `selfie` as `multipart/form-data`.
*   `POST /api/auth/login` - Authenticates credentials and returns a JWT token.
*   `POST /api/user/forgot-password` - Requests an OTP reset code via registered email.
*   `POST /api/user/verify-otp` - Validates the received email OTP.
*   `POST /api/user/reset-password` - Resets account password using the verified OTP.

### Protected Routes (Doctor Only)
*   `POST /api/auth/verify-identity` - Uploads `idFront`, `idBack`, and `selfie` to automatically verify credentials using the Python AI pipeline.

</details>

<details>
<summary>👤 User Profile & Settings</summary>

### Protected Routes (All Authenticated Users)
*   `GET /api/me` - Retrieves the profile information of the logged-in user (excludes password).
*   `PUT /api/user/notification-preferences` - Updates push, email, and SMS notifications toggles.
*   `POST /api/user/2fa/enable` - Generates a 2FA secret and returns a QR Code Data URL.
*   `POST /api/user/2fa/verify` - Verifies a 6-digit authenticator token to activate 2FA on the account.
*   `POST /api/user/2fa/disable` - Disables 2FA verification.
*   `DELETE /api/user/account` - Permanently deletes the account and all associated clinical records (reviews, prescriptions, patient links).

</details>

<details>
<summary>🩺 Doctor Workspace & Patient Management</summary>

### Protected Routes (Doctor Only)
*   `GET /api/doctor/patients` - Retrieves a list of all patients linked to the logged-in doctor.
*   `GET /api/doctor/stats` - Retrieves quick clinical dashboard metrics (total patients, critical cases, active appointments today).
*   `GET /api/doctor/notifications` - Lists clinical notifications.
*   `PUT /api/doctor/notifications/read` - Marks all pending doctor alerts as read.
*   `POST /api/patients` - Creates a new Patient record file in the clinic repository.
*   `GET /api/patients` - Lists all patient profiles under the doctor.
*   `GET /api/patients/:id` - Retrieves a detailed clinical profile of a patient by ID.
*   `PUT /api/patients/:id/status` - Updates patient status (`Improving`, `Stable`, `Critical`).
*   `PUT /api/patients/:id/recovery` - Updates patient recovery progress percentage (0 - 100).
*   `POST /api/doctor/patients/:patientId/review` - Adds a chronological clinical note/review for a patient.
*   `GET /api/doctor/patients/:patientId/reviews` - Fetches the historical list of review notes for a patient.

### Protected Routes (Patient Only)
*   `POST /api/link-doctor` - Links the patient to a dermatologist using their shareable `doctorCode`.

</details>

<details>
<summary>💊 Medication Prescriptions & Resources</summary>

### Protected Routes (Doctor & Patient)
*   `GET /api/patient/:patientId/medications` - Retrieves all medications prescribed to a patient.

### Protected Routes (Doctor Only)
*   `POST /api/patient/:patientId/medications` - Prescribes a new medication (`name`, `dosage`, `frequency`, `notes`) to a patient.
*   `PUT /api/medications/:id` - Updates details of a prescription.
*   `DELETE /api/medications/:id` - Deletes a medication prescription.

### Public Reference Libraries
*   `GET /api/medicines/search?q=<query>` - Searches the Google Sheets database for matching drugs (returns top 20).
*   `GET /api/medicines/match?q=<query>` - Performs an exact match query against the Google Sheet medications database.
*   `GET /api/medicines/all` - Fetches a paginated catalog of all medications.
*   `GET /api/resources/diseases` - Fetches the skin diseases library with descriptions, symptoms, and treatments.

</details>

<details>
<summary>🤖 Artificial Intelligence & Analytics</summary>

### Protected Routes (Doctor Only)
*   `POST /api/analysis/:patientId` - Uploads a skin lesion image (`multipart/form-data`) and queries Hugging Face to return an analysis.
*   `POST /api/ai/improvement` - Uploads `visit1` and `visit2` skin images to perform a comparative severity calculation via Python.

### Protected Routes (Doctor & Patient)
*   `GET /api/patient/:patientId/analyses` - Retrieves the full history of AI skin analyses performed on a patient.

### Protected Routes (Doctor Only Analytics)
*   `GET /api/doctor/history?disease=<name>` - Retreives historical insights for a skin disease.
*   `GET /smart-history/patients?doctor_id=<id>&disease=<name>` - Filters patient lists by diagnosis.
*   `GET /smart-history/treatments?doctor_id=<id>&disease=<name>` - Returns drug effectiveness data and average patient recovery progress.

</details>

<details>
<summary>💬 P2P Messaging (Real-Time Chat)</summary>

### Protected Routes (All Authenticated Users)
*   `GET /api/chat/conversations` - Retrieves all active chat threads, partner profiles, and unread message counts.
*   `GET /api/chat/messages/:receiverId` - Loads chronological chat history with a user and marks unread messages as read.
*   `POST /api/chat/send` - Sends a new text message.

</details>

<details>
<summary>🛡️ Admin Portal</summary>

### Protected Routes (Admin Only)
*   `GET /api/admin/doctors/pending` - Lists all registered doctors whose credentials require approval.
*   `GET /api/admin/doctors` - Lists all registered doctors and their current verification status.
*   `POST /api/admin/verify-doctor/:userId` - Approves (`verified`) or rejects (`rejected`) a doctor's credentials and triggers a transactional email.

</details>

---

## 🔒 Security & Compliance

Dermalyze is engineered to meet professional digital health standards:
1.  **Cascading Deletions:** Deleting a user profile completely purges all sensitive metadata—including messages, prescription history, appointments, and reviews—to align with standard privacy requirements.
2.  **Robust Input Validation:** Standardized query sanitizers parse requests to block Parameter Pollution and SQL Injection. Input schemas enforce strict types and value bounds on all parameters.
3.  **Strict 2FA Enforcement:** Users can enforce Two-Factor Authentication via TOTP. Tokens are verified using cryptographic timing-safe comparisons to prevent timing attacks.
