#!/bin/bash

# ==============================================================================
# Dermalyze Backend - Exhaustive Live API Test Suite
# ==============================================================================

# Configuration
BASE_URL="https://dermalyze-backend-production.up.railway.app"
TS=$(date +%s)
DOCTOR_EMAIL="dr_exhaustive_${TS}@example.com"
PATIENT_EMAIL="pt_exhaustive_${TS}@example.com"
PWD="Password123!"

# Assets
SKIN_IMG="tests/assets/sample_skin.png"
ID_FRONT="tests/assets/id_front.jpg"
ID_BACK="tests/assets/id_front.jpg" # Reuse front if back is tiny/invalid
SELFIE="tests/assets/sample_skin.png" # Use a real image for selfie

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}  Starting Exhaustive API Test Suite: ${BASE_URL}${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Global storage
DOCTOR_TOKEN=""
PATIENT_TOKEN=""
DOCTOR_CODE=""
PATIENT_ID=""
MED_ID=""
CONV_ID=""

# Helper function
api_call() {
    local method=$1
    local path=$2
    local token=$3
    local body=$4
    local multipart=$5
    local label=$6

    echo -e "\n${YELLOW}TEST:${NC} $label [$method $path]"
    
    local cmd=(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${path}")
    if [ -n "$token" ]; then cmd+=(-H "Authorization: Bearer $token"); fi
    if [ -n "$body" ]; then cmd+=(-H "Content-Type: application/json" -d "$body"); fi
    if [ -n "$multipart" ]; then cmd+=($multipart); fi

    local resp=$( "${cmd[@]}" )
    local code=$(echo "$resp" | tail -n1)
    local json=$(echo "$resp" | sed '$d')

    if [[ "$code" =~ ^2 ]]; then
        echo -e "${GREEN}✅ PASS (Status: $code)${NC}"
    else
        echo -e "${RED}❌ FAIL (Status: $code)${NC}"
    fi
    echo "$json" | jq '.' 2>/dev/null || echo "$json"
    
    LAST_BODY="$json"
    LAST_CODE="$code"
}

# ------------------------------------------------------------------------------
# PHASE 1: DOCTOR AUTH & IDENTITY
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--- Phase 1: Doctor Authentication & Identity ---${NC}"

# Register Doctor
api_call "POST" "/api/auth/register" "" "{\"name\":\"Dr. Exhaustive\",\"email\":\"$DOCTOR_EMAIL\",\"password\":\"$PWD\",\"role\":\"doctor\"}" "Register"
DOCTOR_TOKEN=$(echo "$LAST_BODY" | jq -r '.token')
DOCTOR_CODE=$(echo "$LAST_BODY" | jq -r '.user.doctorCode')

# Login Doctor (Verify)
api_call "POST" "/api/auth/login" "" "{\"email\":\"$DOCTOR_EMAIL\",\"password\":\"$PWD\"}" "Login"

# Get Me
api_call "GET" "/api/me" "$DOCTOR_TOKEN" "" "" "Identity (Me)"

# Identity Verification
api_call "POST" "/api/auth/verify-identity" "$DOCTOR_TOKEN" "" "-F idFront=@$ID_FRONT -F idBack=@$ID_BACK -F selfie=@$SELFIE" "Verify Identity"

# ------------------------------------------------------------------------------
# PHASE 2: PATIENT MANAGEMENT
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--- Phase 2: Patient Management ---${NC}"

# Create Patient
api_call "POST" "/api/patients" "$DOCTOR_TOKEN" "{\"name\":\"Patient Verbo\",\"age\":28,\"gender\":\"male\",\"diagnosis\":\"Psoriasis\"}" "Create Patient"
PATIENT_ID=$(echo "$LAST_BODY" | jq -r '._id')

# Get Patients
api_call "GET" "/api/patients" "$DOCTOR_TOKEN" "" "" "List Patients"
api_call "GET" "/api/patients/$PATIENT_ID" "$DOCTOR_TOKEN" "" "" "Get Patient By ID"

# Update Status & Recovery
api_call "PUT" "/api/patients/$PATIENT_ID/status" "$DOCTOR_TOKEN" "{\"status\":\"Improving\"}" "Update Status"
api_call "PUT" "/api/patients/$PATIENT_ID/recovery" "$DOCTOR_TOKEN" "{\"progress\":45}" "Update Recovery"

# AI Analysis
api_call "POST" "/api/analysis/$PATIENT_ID" "$DOCTOR_TOKEN" "" "-F image=@$SKIN_IMG" "AI Analysis Upload"

# Specialist Doctor Routes
api_call "GET" "/api/doctor/patients" "$DOCTOR_TOKEN" "" "" "Doctor's Patients View"
api_call "GET" "/api/doctor/patient/$PATIENT_ID/analyses" "$DOCTOR_TOKEN" "" "" "Doctor's Patient Analyses"
api_call "GET" "/api/patient/$PATIENT_ID/analyses" "$DOCTOR_TOKEN" "" "" "General Patient Analyses"

# ------------------------------------------------------------------------------
# PHASE 3: MEDICATION MANAGEMENT
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--- Phase 3: Medication Management ---${NC}"

# Add Med
api_call "POST" "/api/patient/$PATIENT_ID/medications" "$DOCTOR_TOKEN" "{\"name\":\"Dermalin\",\"dosage\":\"10mg\",\"frequency\":\"Daily\"}" "Add Medication"
MED_ID=$(echo "$LAST_BODY" | jq -r '.medication._id')

# Fetch Meds
api_call "GET" "/api/patient/$PATIENT_ID/medications" "$DOCTOR_TOKEN" "" "" "List Medications"

# Update & Delete
api_call "PUT" "/api/medications/$MED_ID" "$DOCTOR_TOKEN" "{\"dosage\":\"15mg\"}" "Update Medication"
api_call "DELETE" "/api/medications/$MED_ID" "$DOCTOR_TOKEN" "" "" "Delete Medication"

# ------------------------------------------------------------------------------
# PHASE 4: MULTI-USER FLOW (CHAT & LINKING)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--- Phase 4: Multi-User Flow (Chat & Linking) ---${NC}"

# Register Patient Account
api_call "POST" "/api/auth/register" "" "{\"name\":\"Exhaustive Patient\",\"email\":\"$PATIENT_EMAIL\",\"password\":\"$PWD\",\"role\":\"patient\",\"doctorCode\":\"$DOCTOR_CODE\"}" "Patient Registration (Linked)"
PATIENT_TOKEN=$(echo "$LAST_BODY" | jq -r '.token')
OWN_PT_ID=$(echo "$LAST_BODY" | jq -r '.user._id')

# Link Doctor (Explicitly)
api_call "POST" "/api/link-doctor" "$PATIENT_TOKEN" "{\"doctorCode\":\"$DOCTOR_CODE\"}" "Link to Doctor"

# Chat: Create Conversation
api_call "POST" "/api/chat/conversations" "$DOCTOR_TOKEN" "{\"participantId\":\"$OWN_PT_ID\"}" "Create Chat"
CONV_ID=$(echo "$LAST_BODY" | jq -r '._id')

# Chat: Get Conversations
api_call "GET" "/api/chat/conversations" "$DOCTOR_TOKEN" "" "" "Doctor Chat List"
api_call "GET" "/api/chat/conversations" "$PATIENT_TOKEN" "" "" "Patient Chat List"

# Chat: Messages
api_call "GET" "/api/chat/messages/$CONV_ID" "$DOCTOR_TOKEN" "" "" "Fetch History"

# ------------------------------------------------------------------------------
# PHASE 5: STATS & HISTORY
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--- Phase 5: Stats & History ---${NC}"

api_call "GET" "/api/doctor/stats" "$DOCTOR_TOKEN" "" "" "Doctor Dashboard Stats"
# Get History (Requires disease query param)
api_call "GET" "/api/doctor/history?disease=Psoriasis" "$DOCTOR_TOKEN" "" "" "Doctor Analysis History"

echo -e "\n${BLUE}======================================================================${NC}"
echo -e "${GREEN}  Exhaustive Test Suite Finished!${NC}"
echo -e "${BLUE}======================================================================${NC}"
