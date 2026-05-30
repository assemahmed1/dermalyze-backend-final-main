require('dotenv').config();
const { sequelize } = require('./config/db');
const { getPatients, getPatientDetails, getDoctorStats } = require('./controllers/doctorController');
const { getPatientById } = require('./controllers/patientController');
const { getPatientHistory, getTreatmentsByDisease } = require('./routes/smartHistory.repository');
const User = require('./models/User');

async function testFlows() {
  await sequelize.authenticate();
  
  const doctor = await User.findOne({ where: { email: 'dr.ahmed.elsayed@dermalyze.com' } });
  const doctorId = doctor.id;
  
  // Mock req, res
  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    res.send = (data) => { res.data = data; return res; };
    return res;
  };
  
  console.log("1. Testing getPatients...");
  const req1 = { user: { id: doctorId }, query: {} };
  const res1 = mockRes();
  await getPatients(req1, res1, console.error);
  if (!res1.data || !res1.data.patients || res1.data.patients.length === 0) {
     console.error("FAIL: getPatients returned no patients", res1.data);
  } else {
     console.log("PASS: getPatients returned", res1.data.patients.length, "patients.");
     
     // 2. Testing getPatientById (using first patient)
     const patientId = res1.data.patients[0].id;
     console.log(`2. Testing getPatientById for patient ${patientId}...`);
     const req2 = { user: { id: doctorId }, params: { id: patientId } };
     const res2 = mockRes();
     await getPatientById(req2, res2, console.error);
     if (res2.data && res2.data.patient) {
        console.log("PASS: getPatientById worked.");
     } else {
        console.error("FAIL: getPatientById failed", res2.data);
     }
  }
  
  console.log("3. Testing Smart History (Treatments by Disease)...");
  try {
     // Assuming 21 is Acne Vulgaris
     const treatments = await getTreatmentsByDisease(doctorId, 21);
     console.log("PASS: Smart History returned treatments:", treatments.length);
  } catch(e) {
     console.error("FAIL: Smart History treatments:", e);
  }

  process.exit(0);
}

testFlows();
