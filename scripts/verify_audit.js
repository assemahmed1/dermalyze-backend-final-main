require("dotenv").config();
const { sequelize } = require("../config/db");
const jwt = require("jsonwebtoken");
const path = require("path");

// Load models
require("../models");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Medication = require("../models/Medication");

async function runTests() {
  console.log("🚀 Starting E2E Verification Suite...");
  
  // 1. Index Check (Test 4)
  console.log("\n🔍 TEST 4: Checking Database Indexes...");
  try {
    const [medIndexes] = await sequelize.query("SHOW INDEX FROM ClinicalMedications");
    const [diseaseIndexes] = await sequelize.query("SHOW INDEX FROM Diseases");

    const medIndexedFields = medIndexes.map(idx => idx.Column_name);
    const diseaseIndexedFields = diseaseIndexes.map(idx => idx.Column_name);

    const hasMedName = medIndexedFields.includes("name");
    const hasMedCategory = medIndexedFields.includes("category");
    const hasDiseaseName = diseaseIndexedFields.includes("name");
    const hasDiseaseSciName = diseaseIndexedFields.includes("scientificName");

    if (hasMedName && hasMedCategory && hasDiseaseName && hasDiseaseSciName) {
      console.log("✅ TEST 4 SUCCESS: Indexes verified successfully on both tables!");
      console.log(` - ClinicalMedications: ${medIndexedFields.filter(f => ["name", "category"].includes(f)).join(", ")}`);
      console.log(` - Diseases: ${diseaseIndexedFields.filter(f => ["name", "scientificName"].includes(f)).join(", ")}`);
    } else {
      console.log("❌ TEST 4 FAILED: Missing indexes!");
    }
  } catch (err) {
    console.error("❌ TEST 4 ERROR:", err.message);
  }

  // 2. Fetch Doctor & Patient Users
  console.log("\n🔑 Generating Test Tokens...");
  let doctorToken = "";
  let patientToken = "";
  let testPatientId = null;

  try {
    // Find or create doctor
    let doctorUser = await User.findOne({ where: { role: "doctor" } });
    if (!doctorUser) {
      doctorUser = await User.create({
        name: "Test Doctor",
        email: "testdoctor@dermalyze.com",
        password: "hashedpassword123",
        role: "doctor",
        verificationStatus: "verified"
      });
    }
    doctorToken = jwt.sign({ id: doctorUser.id, role: "doctor" }, process.env.JWT_SECRET);
    console.log(" - Doctor Token signed successfully.");

    // Find or create patient
    let patientUser = await User.findOne({ where: { role: "patient" } });
    if (!patientUser) {
      patientUser = await User.create({
        name: "Test Patient",
        email: "testpatient@dermalyze.com",
        password: "hashedpassword123",
        role: "patient"
      });
    }
    
    // Ensure Patient record exists
    let patientRecord = await Patient.findOne({ where: { userId: patientUser.id } });
    if (!patientRecord) {
      patientRecord = await Patient.create({
        userId: patientUser.id,
        gender: "male",
        age: 30,
        status: "stable"
      });
    }
    testPatientId = patientRecord.id;

    // Seed a medication for Test 2 if none exists
    const medCount = await Medication.count({ where: { patientId: testPatientId } });
    if (medCount === 0) {
      await Medication.create({
        patientId: testPatientId,
        doctorId: doctorUser.id,
        name: "Clindamycin Gel",
        dosage: "10mg",
        frequency: "Once Daily",
        isActive: true,
        notes: "Apply to affected areas"
      });
    }

    patientToken = jwt.sign({ id: patientUser.id, role: "patient" }, process.env.JWT_SECRET);
    console.log(" - Patient Token signed successfully.");
  } catch (err) {
    console.error("❌ Error setting up test entities:", err.message);
    process.exit(1);
  }

  // 3. Start Express Server on Port 5051
  console.log("\n🌐 Starting Server on port 5051...");
  const serverPath = path.join(__dirname, "../server.js");
  process.env.PORT = 5051;
  const appServer = require(serverPath);

  // Wait 2 seconds for server initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Test 1: GET /api/smart-history/patients without Token
  console.log("\n🔒 TEST 1: Requesting GET /api/smart-history/patients without token...");
  try {
    const res = await fetch("http://localhost:5051/api/smart-history/patients?disease=Eczema");
    console.log(` - Response Status: ${res.status}`);
    const body = await res.json();
    console.log(` - Response Body:`, body);
    if (res.status === 401) {
      console.log("✅ TEST 1 SUCCESS: Access successfully denied (401 Unauthorized)!");
    } else {
      console.log("❌ TEST 1 FAILED: Unexpected status code!");
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err.message);
  }

  // 5. Test 2: GET /api/patients/me/medications with Token
  console.log("\n🔒 TEST 2: Requesting GET /api/patients/me/medications with valid Patient Token...");
  try {
    const res = await fetch("http://localhost:5051/api/patients/me/medications", {
      headers: { "Authorization": `Bearer ${patientToken}` }
    });
    console.log(` - Response Status: ${res.status}`);
    const body = await res.json();
    console.log(` - Response Body:`, body);
    if (res.status === 200 && body.success && Array.isArray(body.data) && body.data.length > 0) {
      console.log("✅ TEST 2 SUCCESS: Patient clinical medications successfully returned and not empty!");
    } else {
      console.log("❌ TEST 2 FAILED: Dashboard did not return the expected active clinical patient records.");
    }
  } catch (err) {
    console.error("❌ TEST 2 ERROR:", err.message);
  }

  // 6. Test 3: AI Rate Limiter & Security Checks
  console.log("\n🔒 TEST 3: Verifying AI Scan Security & Rate Limiter...");
  
  // A. Without Token
  console.log(" A. Requesting POST /api/ai/improvement without Token...");
  try {
    const res = await fetch("http://localhost:5051/api/ai/improvement", { method: "POST" });
    console.log(`  - Response Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  ✅ Security Check: Unauthenticated access blocked successfully (401)!");
    } else {
      console.log("  ❌ Security Check: Failed, expected 401.");
    }
  } catch (err) {
    console.error("  ❌ Security Check Error:", err.message);
  }

  // B. With Token - Hit 6 times to trigger 429
  console.log(" B. Requesting POST /api/ai/improvement 6 times sequentially with valid Doctor Token...");
  try {
    for (let i = 1; i <= 6; i++) {
      const res = await fetch("http://localhost:5051/api/ai/improvement", {
        method: "POST",
        headers: { "Authorization": `Bearer ${doctorToken}` }
      });
      console.log(`  - Request #${i}: Response Status = ${res.status}`);
      const body = await res.json();
      
      if (i === 6) {
        if (res.status === 429) {
          console.log("  ✅ TEST 3 SUCCESS: Rate limiter successfully triggered (429 Too Many Requests) on the 6th call!");
          console.log(`  - Message:`, body);
        } else {
          console.log(`  ❌ TEST 3 FAILED: Expected 429 on 6th request but got ${res.status}.`);
        }
      }
    }
  } catch (err) {
    console.error("  ❌ Rate Limiter Test Error:", err.message);
  }

  console.log("\n🎉 E2E Verification Complete!");
  process.exit(0);
}

runTests();
