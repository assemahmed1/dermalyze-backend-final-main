#!/bin/bash

# ==============================================================================
# Dermalyze Backend - Verbose Live API Test Suite & Debugger
# ==============================================================================

# Configuration
BASE_URL="https://dermalyze-backend-production.up.railway.app"
TIMESTAMP=$(date +%s)
TEST_EMAIL="doctor_verbose_${TIMESTAMP}@example.com"
TEST_PASSWORD="Password123!"
SAMPLE_IMAGE="tests/assets/sample_skin.png"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}  Starting Verbose API Test & Report: ${BASE_URL}${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Helper function to perform requests and capture everything
# Usage: api_request "METHOD" "PATH" "AUTH_TOKEN" "JSON_BODY" "MULTIPART_FILE_OPTION"
api_request() {
    local method=$1
    local path=$2
    local token=$3
    local body=$4
    local file_opt=$5
    local url="${BASE_URL}${path}"

    echo -e "\n${YELLOW}ENDPOINT:${NC} [${method}] ${path}"
    
    local curl_cmd=(curl -s -w "\n%{http_code}" -X "$method" "$url")
    
    if [ -n "$token" ]; then
        curl_cmd+=(-H "Authorization: Bearer $token")
    fi
    
    if [ -n "$body" ]; then
        echo -e "${YELLOW}PAYLOAD:${NC} $body"
        curl_cmd+=(-H "Content-Type: application/json" -d "$body")
    fi
    
    if [ -n "$file_opt" ]; then
        echo -e "${YELLOW}FILE:${NC} $file_opt"
        curl_cmd+=($file_opt)
    fi

    local response=$( "${curl_cmd[@]}" )
    local http_code=$(echo "$response" | tail -n1)
    local body_content=$(echo "$response" | sed '$d')

    echo -e "${YELLOW}STATUS:${NC} $http_code"
    echo -e "${YELLOW}RESPONSE:${NC}"
    echo "$body_content" | jq '.' 2>/dev/null || echo "$body_content"

    # Export variables for script logic
    LAST_BODY="$body_content"
    LAST_STATUS="$http_code"
}

# ==============================================================================
# 1. AUTHENTICATION FLOW
# ==============================================================================
echo -e "\n${BLUE}--- Phase 1: Authentication ---${NC}"

# Register
api_request "POST" "/api/auth/register" "" "{\"name\": \"Dr. Verbose\", \"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"role\": \"doctor\"}"
if [ "$LAST_STATUS" -ne 201 ]; then echo -e "${RED}Blocker: Registration failed.${NC}"; exit 1; fi

# Login
api_request "POST" "/api/auth/login" "" "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}"
TOKEN=$(echo "$LAST_BODY" | jq -r '.token')
if [ "$TOKEN" == "null" ]; then echo -e "${RED}Blocker: Login failed.${NC}"; exit 1; fi

# Me
api_request "GET" "/api/me" "$TOKEN"

# ==============================================================================
# 2. PATIENT MANAGEMENT
# ==============================================================================
echo -e "\n${BLUE}--- Phase 2: Patient Management ---${NC}"

# Create Patient
api_request "POST" "/api/patients" "$TOKEN" "{\"name\": \"Verbose Patient\", \"age\": 40, \"gender\": \"female\", \"diagnosis\": \"Research test\"}"
PATIENT_ID=$(echo "$LAST_BODY" | jq -r '._id')
if [ "$PATIENT_ID" == "null" ]; then echo -e "${RED}Blocker: Patient creation failed.${NC}"; exit 1; fi

# Get All Patients
api_request "GET" "/api/patients" "$TOKEN"

# Get Specific Patient
api_request "GET" "/api/patients/$PATIENT_ID" "$TOKEN"

# Update Status
api_request "PUT" "/api/patients/$PATIENT_ID/status" "$TOKEN" "{\"status\": \"Stable\"}"

# ==============================================================================
# 3. ANALYSIS & HISTORY
# ==============================================================================
echo -e "\n${BLUE}--- Phase 3: AI Analysis & Doctor Features ---${NC}"

# Upload for Analysis
echo -e "\n${YELLOW}ENDPOINT:${NC} [POST] /api/analysis/$PATIENT_ID"
if [ ! -f "$SAMPLE_IMAGE" ]; then
    echo -e "${RED}Error: $SAMPLE_IMAGE missing!${NC}"
else
    # Use direct curl for multipart to capture accurately
    api_request "POST" "/api/analysis/$PATIENT_ID" "$TOKEN" "" "-F image=@$SAMPLE_IMAGE"
fi

# Get Patient Analyses
api_request "GET" "/api/patient/$PATIENT_ID/analyses" "$TOKEN"

# Get History
api_request "GET" "/api/doctor/history" "$TOKEN"

# Get Stats
api_request "GET" "/api/doctor/stats" "$TOKEN"

# ==============================================================================
# 4. MEDICATION MANAGEMENT
# ==============================================================================
echo -e "\n${BLUE}--- Phase 4: Medication Management ---${NC}"

# Add Medication (Note the path: /api/patient/:id/medications)
api_request "POST" "/api/patient/$PATIENT_ID/medications" "$TOKEN" "{\"name\": \"TestMed\", \"dosage\": \"5ml\", \"frequency\": \"Twice daily\"}"
MED_ID=$(echo "$LAST_BODY" | jq -r '.medication._id')

# Get Medications
api_request "GET" "/api/patient/$PATIENT_ID/medications" "$TOKEN"

# Update Medication
if [ "$MED_ID" != "null" ]; then
    api_request "PUT" "/api/medications/$MED_ID" "$TOKEN" "{\"dosage\": \"10ml\"}"
    # Delete Medication
    api_request "DELETE" "/api/medications/$MED_ID" "$TOKEN"
fi

echo -e "\n${BLUE}======================================================================${NC}"
echo -e "${GREEN}  Verbose Test Suite Finished!${NC}"
echo -e "${BLUE}======================================================================${NC}"
