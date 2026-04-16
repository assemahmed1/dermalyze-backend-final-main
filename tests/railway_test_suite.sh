#!/bin/bash

# Configuration
BASE_URL="https://dermalyze-backend-production.up.railway.app"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_doctor_prod_${TIMESTAMP}@example.com"
TEST_PASSWORD="Password123!"
SAMPLE_IMAGE="tests/assets/sample_skin.png"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Full Test Suite against: ${BASE_URL}${NC}"

# 1. Health Check
echo -e "\n1. Testing Health Check..."
HEALTH=$(curl -s -X GET "${BASE_URL}/")
if [[ "$HEALTH" == *"Dermalyze Backend Running"* ]]; then
    echo -e "${GREEN}✅ Server is alive: $HEALTH${NC}"
else
    echo -e "${RED}❌ Health check failed! Response: $HEALTH${NC}"
    # exit 1
fi

# 2. Registration
echo -e "\n2. Registering Test Doctor..."
REGISTER_RESP=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Doctor Prod\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"role\": \"doctor\"
  }")

echo "$REGISTER_RESP" > register_resp.json
MESSAGE=$(echo "$REGISTER_RESP" | jq -r '.message')

if [[ "$MESSAGE" == *"successfully"* ]]; then
    echo -e "${GREEN}✅ Doctor registered successfully.${NC}"
else
    echo -e "${RED}❌ Registration failed: $REGISTER_RESP${NC}"
    exit 1
fi

# 3. Login
echo -e "\n3. Logging In..."
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$LOGIN_RESP" > login_resp.json
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful. Token received.${NC}"
else
    echo -e "${RED}❌ Login failed!${NC}"
    echo "$LOGIN_RESP"
    exit 1
fi

# 4. Create Patient
echo -e "\n4. Creating Test Patient..."
PATIENT_RESP=$(curl -s -X POST "${BASE_URL}/api/patient" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Patient Zero\",
    \"age\": 30,
    \"gender\": \"male\",
    \"contactNumber\": \"0123456789\"
  }")

echo "$PATIENT_RESP" > patient_resp.json
PATIENT_ID=$(echo "$PATIENT_RESP" | jq -r '._id')

if [ "$PATIENT_ID" != "null" ] && [ -n "$PATIENT_ID" ]; then
    echo -e "${GREEN}✅ Patient created. ID: $PATIENT_ID${NC}"
else
    echo -e "${RED}❌ Patient creation failed!${NC}"
    echo "$PATIENT_RESP"
    exit 1
fi

# 5. Image Analysis
echo -e "\n5. Testing Image Analysis Endpoint..."
if [ ! -f "$SAMPLE_IMAGE" ]; then
    echo -e "${RED}❌ Sample image not found at $SAMPLE_IMAGE${NC}"
    exit 1
fi

ANALYSIS_RESP=$(curl -s -X POST "${BASE_URL}/api/analysis/$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$SAMPLE_IMAGE")

echo "$ANALYSIS_RESP" > analysis_resp.json
ANALYSIS_RESULT=$(echo "$ANALYSIS_RESP" | jq -r '.analysis.result')

if [[ "$ANALYSIS_RESULT" != "null" ]]; then
    echo -e "${GREEN}✅ Analysis completed.${NC}"
    echo -e "Result: ${GREEN}$ANALYSIS_RESULT${NC}"
else
    echo -e "${RED}❌ Analysis failed or returned empty!${NC}"
    echo "$ANALYSIS_RESP"
fi

echo -e "\n${GREEN}Test Suite Finished!${NC}"
