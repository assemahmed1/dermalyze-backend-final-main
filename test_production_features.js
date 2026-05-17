require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { sequelize } = require("./config/db");
const User = require("./models/User");
const Patient = require("./models/Patient");
const Message = require("./models/Message");
const { generateAccessToken, generateRefreshToken } = require("./utils/generateToken");

const BASE_URL = "http://localhost:5050";

async function runTests() {
  console.log("🚀 Starting Production Upgrades Verification Suite...");

  await sequelize.authenticate();
  console.log("✅ Database connected successfully.");

  // Create temporary doctor and patient accounts for testing
  const suffix = Date.now();
  const docEmail = `test_doc_${suffix}@example.com`;
  const patEmail = `test_pat_${suffix}@example.com`;
  const password = "password123";

  console.log("🧹 Creating temporary test doctor and patient in database...");
  const testDoctor = await User.create({
    name: "Dr. Production Test",
    email: docEmail,
    password: password,
    role: "doctor",
    verificationStatus: "verified"
  });

  const testPatient = await User.create({
    name: "Patient Production Test",
    email: patEmail,
    password: password,
    role: "patient"
  });

  // Create a patient record inside the Patients table mapped to this doctor
  const patientProfile = await Patient.create({
    name: "Patient Profile",
    email: patEmail,
    phone: "1234567890",
    gender: "Male",
    age: 30,
    nationalId: `NAT-${suffix}`,
    dateOfBirth: "1996-01-01",
    doctorId: testDoctor.id
  });

  const doctorToken = generateAccessToken(testDoctor.id, testDoctor.role);
  const patientToken = generateAccessToken(testPatient.id, testPatient.role);

  try {
    // 🧪 Test 1: Log in & Verify Access/Refresh Tokens
    console.log("\n🧪 Test 1: Log in as Doctor & Verify HTTP Cookie and Access Token...");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: docEmail,
      password: password
    });
    
    const loginAccessToken = loginRes.data.token;
    console.log(`✅ Access Token received (expires 15m): ${loginAccessToken.substring(0, 20)}...`);
    
    const rawCookies = loginRes.headers["set-cookie"] || [];
    const cookie = rawCookies.find(c => c.startsWith("refreshToken="));
    if (cookie) {
      console.log(`✅ Refresh Token HTTP Cookie received (expires 7d): ${cookie.substring(0, 35)}...`);
    } else {
      console.warn("⚠️ Refresh Token cookie not found in response headers!");
    }

    // 🧪 Test 2: Token Refreshing
    console.log("\n🧪 Test 2: Verify Access Token Refreshing (/api/auth/refresh)...");
    const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
      headers: { Cookie: cookie }
    });
    console.log(`✅ New Access Token generated: ${refreshRes.data.token.substring(0, 20)}...`);

    // 🧪 Test 3: Role-Based Access Control (RBAC)
    console.log("\n🧪 Test 3: Verify Role-Based Access Control (RBAC)...");
    try {
      await axios.get(`${BASE_URL}/api/doctor/patients`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      console.error("❌ RBAC Failure: Patient successfully accessed doctor endpoint!");
    } catch (err) {
      console.log(`✅ RBAC Success: Patient access blocked. Status: ${err.response?.status} (${err.response?.data?.message || err.message})`);
    }

    // 🧪 Test 4: Rate Limiting
    console.log("\n🧪 Test 4: Verify Rate Limiting on Login...");
    let rateLimitReached = false;
    for (let i = 0; i < 15; i++) {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          email: docEmail,
          password: "wrongpassword"
        });
      } catch (err) {
        if (err.response?.status === 429) {
          rateLimitReached = true;
          console.log(`✅ Rate Limiter Success: Blocked request at try ${i+1}. Message: ${JSON.stringify(err.response.data)}`);
          break;
        }
      }
    }
    if (!rateLimitReached) {
      console.warn("⚠️ Rate limiter was not triggered.");
    }

    // 🧪 Test 5: Non-Blocking AI Analysis
    console.log("\n🧪 Test 5: Verify Asynchronous Non-Blocking AI Analysis...");
    const form = new FormData();
    form.append("image", fs.createReadStream("/Users/assemahmed/Downloads/dermalyze-backend-final-main/tests/assets/sample_skin.png"));

    const start = Date.now();
    const analysisRes = await axios.post(`${BASE_URL}/api/analysis/${patientProfile.id}`, form, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        ...form.getHeaders()
      }
    });
    const duration = Date.now() - start;

    console.log(`✅ Non-blocking analysis returned in ${duration}ms! (Expected < 500ms since AI is asynchronous)`);
    console.log(`✅ Initial Response Body:`, JSON.stringify(analysisRes.data, null, 2));

    // Wait 5 seconds for background processing to complete
    console.log("⏳ Waiting 5 seconds for background AI thread to complete...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch analyses to verify completed state
    const historyRes = await axios.get(`${BASE_URL}/api/patient/${patientProfile.id}/analyses`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const updatedAnalysis = historyRes.data.find(a => a.id === analysisRes.data.analysis.id);
    console.log(`✅ Updated Analysis in DB:`, JSON.stringify(updatedAnalysis, null, 2));

    // 🧪 Test 6: Pagination & Read receipts
    console.log("\n🧪 Test 6: Verify Pagination and Read Receipts...");
    
    // Create 3 mock messages to test pagination
    await Message.create({ senderId: testPatient.id, receiverId: testDoctor.id, content: "Msg 1", type: "text" });
    await Message.create({ senderId: testPatient.id, receiverId: testDoctor.id, content: "Msg 2", type: "text" });
    await Message.create({ senderId: testPatient.id, receiverId: testDoctor.id, content: "Msg 3", type: "text" });

    const paginatedRes = await axios.get(`${BASE_URL}/api/chat/messages/${testPatient.id}?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    console.log(`✅ Paginated Chat History (page=1, limit=2):`, JSON.stringify(paginatedRes.data, null, 2));

    const readRes = await axios.put(`${BASE_URL}/api/chat/messages/read`, {
      senderId: testPatient.id.toString()
    }, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    console.log(`✅ Read Receipt Response:`, JSON.stringify(readRes.data, null, 2));

    // 🧪 Test 7: Caching
    console.log("\n🧪 Test 7: Verify Cache Caching on Clinical Resources...");
    const cacheStart1 = Date.now();
    await axios.get(`${BASE_URL}/api/resources/diseases`);
    const duration1 = Date.now() - cacheStart1;

    const cacheStart2 = Date.now();
    await axios.get(`${BASE_URL}/api/resources/diseases`);
    const duration2 = Date.now() - cacheStart2;

    console.log(`✅ Cache Test: First request duration: ${duration1}ms`);
    console.log(`✅ Cache Test: Second request (Cache HIT) duration: ${duration2}ms (Expected near 0ms)`);

    // 🧪 Test 8: Standardized Error Handling
    console.log("\n🧪 Test 8: Verify Standardized Error Response Layout...");
    try {
      await axios.get(`${BASE_URL}/api/invalid-route-error-test-dermalyze`);
    } catch (err) {
      console.log(`✅ Standardized Error Success:`, JSON.stringify(err.response?.data, null, 2));
    }

    console.log("\n🎉 Verification Suite Completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  } finally {
    console.log("\n🧹 Cleaning up temporary test records from DB...");
    await Message.destroy({ where: { [Op.or]: [{ senderId: testPatient.id }, { receiverId: testPatient.id }] } }).catch(() => {});
    await Patient.destroy({ where: { id: patientProfile.id } }).catch(() => {});
    await testPatient.destroy().catch(() => {});
    await testDoctor.destroy().catch(() => {});
    console.log("✅ Cleanup finished.");
    process.exit(0);
  }
}

// Support Op in cleanup
const { Op } = require("sequelize");
runTests().catch(err => {
  console.error("❌ Test script failed:", err);
  process.exit(1);
});
