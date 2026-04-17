#!/bin/bash

# Configuration
BASE_URL="https://dermalyze-backend-production.up.railway.app/api"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_fix_verify_${TIMESTAMP}@example.com"
TEST_PASSWORD="Password123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}--- Live Production Fix Verification ---${NC}"
echo -e "Target API: ${BASE_URL}"

# 1. Registration
echo -e "\n1. Registering Test Doctor..."
REGISTER_RESP=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Verify Bot\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"role\": \"doctor\"
  }")

MESSAGE=$(echo "$REGISTER_RESP" | jq -r '.message')
if [[ "$MESSAGE" == *"successfully"* ]]; then
    echo -e "${GREEN}✅ Doctor registered.${NC}"
else
    echo -e "${RED}❌ Registration failed: $REGISTER_RESP${NC}"
    exit 1
fi

# 2. Login
echo -e "\n2. Logging In..."
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful. Token obtained.${NC}"
else
    echo -e "${RED}❌ Login failed!${NC}"
    exit 1
fi

# 3. HTTP Negative Tests (Invalid ID)
echo -e "\n3. Testing Negative Cases (Expected 400 Bad Request):"

# Route: Get Messages
echo -n "   - GET /chat/messages/doctor_123: "
RESP_400_1=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/chat/messages/doctor_123" \
  -H "Authorization: Bearer $TOKEN")
if [ "$RESP_400_1" == "400" ]; then echo -e "${GREEN}PASS (400)${NC}"; else echo -e "${RED}FAIL ($RESP_400_1)${NC}"; fi

# Route: Create Conversation
echo -n "   - POST /chat/conversations (invalid participantId): "
RESP_400_2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/chat/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"participantId\": \"doctor_123\"}")
if [ "$RESP_400_2" == "400" ]; then echo -e "${GREEN}PASS (400)${NC}"; else echo -e "${RED}FAIL ($RESP_400_2)${NC}"; fi

# Route: Get Patient
echo -n "   - GET /patients/doctor_123: "
RESP_400_3=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/patients/doctor_123" \
  -H "Authorization: Bearer $TOKEN")
if [ "$RESP_400_3" == "400" ]; then echo -e "${GREEN}PASS (400)${NC}"; else echo -e "${RED}FAIL ($RESP_400_3)${NC}"; fi

# Route: Analysis
echo -n "   - POST /analysis/doctor_123: "
RESP_400_4=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/analysis/doctor_123" \
  -H "Authorization: Bearer $TOKEN")
if [ "$RESP_400_4" == "400" ]; then echo -e "${GREEN}PASS (400)${NC}"; else echo -e "${RED}FAIL ($RESP_400_4)${NC}"; fi

# 4. Socket Negative Tests
echo -e "\n4. Testing Socket Negative Cases (Expecting error events):"
export PATH=$PATH:/usr/local/bin
SOCKET_RESULTS=$(node scratch/socket_verify_invalid.js "$TOKEN" 2>/dev/null)
if [[ "$SOCKET_RESULTS" == *"\"join_chat\":true"* ]]; then
    echo -e "${GREEN}✅ join_chat blocked invalid ID.${NC}"
else
    echo -e "${RED}❌ join_chat failed/timeout.${NC}"
fi

if [[ "$SOCKET_RESULTS" == *"\"send_message\":true"* ]]; then
    echo -e "${GREEN}✅ send_message blocked invalid ID.${NC}"
else
    echo -e "${RED}❌ send_message failed/timeout.${NC}"
fi

# 5. Regression Test (Valid ID)
echo -e "\n5. Testing Regression (Expected 2xx/Normal Flow):"
PATIENT_RESP=$(curl -s -X POST "${BASE_URL}/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Verification Patient\",
    \"age\": 45,
    \"gender\": \"female\"
  }")
PATIENT_ID=$(echo "$PATIENT_RESP" | jq -r '._id')

if [ "$PATIENT_ID" != "null" ] && [ -n "$PATIENT_ID" ]; then
    echo -e "${GREEN}✅ Valid patient creation still works. ID: $PATIENT_ID${NC}"
else
    echo -e "${RED}❌ Regression: Valid patient creation failed!${NC}"
    echo "$PATIENT_RESP"
fi

echo -e "\n${BLUE}--- Verification Finished ---${NC}"
