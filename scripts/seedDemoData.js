require('dotenv').config();
const { sequelize } = require('../config/db');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Medication = require('../models/Medication');
const Analysis = require('../models/Analysis');
const Disease = require('../models/Disease');
const ClinicalMedication = require('../models/ClinicalMedication');
const SmartPatient = require('../models/SmartPatient');
const SmartPatientDisease = require('../models/SmartPatientDisease');
const SmartTreatment = require('../models/SmartTreatment');
const SmartImprovementRate = require('../models/SmartImprovementRate');
const SmartDoctor = require('../models/SmartDoctor');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

const DOCTOR_EMAIL = 'dr.ahmed.elsayed@dermalyze.com';
const DOCTOR_PASS = 'Demo@2024';
const PATIENT_PASS = 'Patient@2024';

const WIKIMEDIA_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/4d/Acne_vulgaris_on_a_back.jpg";

const patientData = [
  { name: 'Shawky Mohamed Abdullah', age: 28, gender: 'male', recovery: 75, email: 'shawky.demo@dermalyze.com', group: 'Acne Vulgaris' },
  { name: 'Sara Khaled Mahmoud', age: 22, gender: 'female', recovery: 60, email: 'sara.demo@dermalyze.com', group: 'Acne Vulgaris' },
  { name: 'Abdullah Farouk Nabil', age: 33, gender: 'male', recovery: 85, email: 'abdullah.demo@dermalyze.com', group: 'Acne Vulgaris' },
  { name: 'Yasmine Samy Hassan', age: 27, gender: 'female', recovery: 45, email: 'yasmine.demo@dermalyze.com', group: 'Acne Vulgaris' },
  { name: 'Tamer Ibrahim Rashad', age: 39, gender: 'male', recovery: 70, email: 'tamer.demo@dermalyze.com', group: 'Acne Vulgaris' },

  { name: 'Mohamed Omar Farouk', age: 45, gender: 'male', recovery: 55, email: 'mohamed.demo@dermalyze.com', group: 'Psoriasis' },
  { name: 'Mostafa Ayman Hamid', age: 35, gender: 'male', recovery: 40, email: 'mostafa.demo@dermalyze.com', group: 'Psoriasis' },
  { name: 'Shereen Hosny Mourad', age: 44, gender: 'female', recovery: 65, email: 'shereen.demo@dermalyze.com', group: 'Psoriasis' },
  { name: 'Bassem Refaat El-Shafei', age: 37, gender: 'male', recovery: 50, email: 'bassem.demo@dermalyze.com', group: 'Psoriasis' },

  { name: 'Noura Ahmed Ibrahim', age: 34, gender: 'female', recovery: 80, email: 'noura.demo@dermalyze.com', group: 'Atopic Dermatitis' },
  { name: 'Dina Fathy Awad', age: 31, gender: 'female', recovery: 70, email: 'dina.demo@dermalyze.com', group: 'Atopic Dermatitis' },
  { name: 'Lamia Adel Hegazy', age: 30, gender: 'female', recovery: 55, email: 'lamia.demo@dermalyze.com', group: 'Atopic Dermatitis' },

  { name: 'Mona Walid Gamal', age: 25, gender: 'female', recovery: 35, email: 'mona.demo@dermalyze.com', group: 'Vitiligo' },
  { name: 'Rana Mahmoud Othman', age: 24, gender: 'female', recovery: 25, email: 'rana.demo@dermalyze.com', group: 'Vitiligo' },
  { name: 'Asmaa Gamal El-Din', age: 26, gender: 'female', recovery: 40, email: 'asmaa.demo@dermalyze.com', group: 'Vitiligo' },

  { name: 'Omar Abdel Rahman Ali', age: 31, gender: 'male', recovery: 65, email: 'omar.demo@dermalyze.com', group: 'Rosacea' },
  { name: 'Kareem Tarek Mansour', age: 38, gender: 'male', recovery: 90, email: 'kareem.demo@dermalyze.com', group: 'Tinea Corporis' },
  { name: 'Ahmed Hossam El-Din', age: 42, gender: 'male', recovery: 80, email: 'ahmed.demo@dermalyze.com', group: 'Folliculitis' },
  { name: 'Heba Ramy Suleiman', age: 29, gender: 'female', recovery: 45, email: 'heba.demo@dermalyze.com', group: 'Alopecia Areata' },
  { name: 'Youssef Saeed El-Banna', age: 48, gender: 'male', recovery: 95, email: 'youssef.demo@dermalyze.com', group: 'Scabies' }
];

function getStatus(recovery) {
  if (recovery > 70) return 'Improving';
  if (recovery >= 40) return 'Stable';
  return 'Critical';
}

function getRandomDate(pastMonths, futureWeeks) {
  const date = new Date();
  if (pastMonths) {
    date.setMonth(date.getMonth() - Math.floor(Math.random() * pastMonths));
    date.setDate(date.getDate() - Math.floor(Math.random() * 28));
  } else if (futureWeeks) {
    date.setDate(date.getDate() + Math.floor(Math.random() * futureWeeks * 7));
  }
  return date.toISOString();
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("DB Connected.");

    // Pre-fetch mappings
    const diseaseRecords = await Disease.findAll();
    const diseaseMap = {};
    for (const d of diseaseRecords) {
      diseaseMap[d.name] = d.id;
    }

    const meds = await ClinicalMedication.findAll();
    const medsList = meds.map(m => ({ id: m.id, name: m.name }));
    
    // Fallback medication arrays from what exists in DB
    const acneMeds = medsList.filter(m => /adapalene|benzoyl|clindamycin|tretinoin|doxycycline/i.test(m.name));
    const psoriasisMeds = medsList.filter(m => /methotrexate|betamethasone|coal tar|calcipotriol/i.test(m.name));
    const dermatitisMeds = medsList.filter(m => /hydrocortisone|tacrolimus|dupilumab/i.test(m.name));
    const genericMeds = medsList.length > 0 ? medsList : [{id: null, name: "Generic Ointment"}];

    if (acneMeds.length === 0) acneMeds.push(genericMeds[0]);
    if (psoriasisMeds.length === 0) psoriasisMeds.push(genericMeds[0]);
    if (dermatitisMeds.length === 0) dermatitisMeds.push(genericMeds[0]);

    // 1. DOCTOR
    let doctor = await User.findOne({ where: { email: DOCTOR_EMAIL } });
    if (!doctor) {
      const hashed = await bcrypt.hash(DOCTOR_PASS, 10);
      doctor = await User.create({
        name: 'Dr. Ahmed Mahmoud El-Sayed',
        email: DOCTOR_EMAIL,
        password: hashed,
        role: 'doctor',
        verificationStatus: 'verified',
        status: 'active'
      });
      console.log("Created Doctor.");
    } else {
      console.log("Doctor exists.");
    }

    // Ensure SmartDoctor exists
    const namesD = doctor.name.replace('Dr. ', '').split(' ');
    await SmartDoctor.findOrCreate({
      where: { doctor_id: doctor.id },
      defaults: {
        first_name: namesD[0] || 'Doctor',
        last_name: namesD.slice(1).join(' ') || 'Name',
        email: doctor.email,
        specialization: 'Dermatologist',
        experience_years: 15
      }
    });

    // Process Patients
    for (const pd of patientData) {
      console.log(`Processing patient: ${pd.name}`);
      let pUser = await User.findOne({ where: { email: pd.email } });
      if (!pUser) {
        const hashedP = await bcrypt.hash(PATIENT_PASS, 10);
        pUser = await User.create({
          name: pd.name,
          email: pd.email,
          password: hashedP,
          role: 'patient',
          verificationStatus: 'verified',
          status: 'active'
        });
      }

      let dId = diseaseMap[pd.group];
      if (!dId) {
          console.log(`Missing disease: ${pd.group}, using fallback.`);
          dId = diseaseRecords[0].id; // Fallback
      }

      let patient = await Patient.findOne({ where: { userId: pUser.id } });
      if (!patient) {
        patient = await Patient.create({
          name: pd.name,
          age: pd.age,
          gender: pd.gender,
          diagnosisId: dId,
          status: getStatus(pd.recovery),
          recoveryProgress: pd.recovery,
          doctorId: doctor.id,
          userId: pUser.id,
          medicalHistory: "Patient presents with persistent symptoms. Shows gradual changes to current medical regimen.",
          lastVisit: getRandomDate(3, 0),
          nextAppointment: getRandomDate(0, 2)
        });
      } else {
        await patient.update({
          diagnosisId: dId,
          status: getStatus(pd.recovery),
          recoveryProgress: pd.recovery,
          doctorId: doctor.id
        });
      }

      // Add Medications
      await Medication.destroy({ where: { patientId: patient.id } });
      let selectedMeds = [];
      if (pd.group === 'Acne Vulgaris') selectedMeds = acneMeds;
      else if (pd.group === 'Psoriasis') selectedMeds = psoriasisMeds;
      else selectedMeds = dermatitisMeds;

      // Pick 1-2 random meds
      let mCount = Math.floor(Math.random() * 2) + 1;
      let usedMeds = new Set();
      for (let i = 0; i < mCount; i++) {
        let m = selectedMeds[Math.floor(Math.random() * selectedMeds.length)];
        if (!m) m = genericMeds[0];
        
        let mId = m.id;
        let mName = m.name;
        
        if (!usedMeds.has(mName)) {
           usedMeds.add(mName);
           const med = await Medication.create({
             patientId: patient.id,
             doctorId: doctor.id,
             clinicalMedicationId: mId,
             name: mName,
             dosage: "Standard Dose",
             frequency: "Daily",
             isActive: true
           });

           // Smart History
           const names = pd.name.split(' ');
           const sp = await SmartPatient.findOrCreate({
             where: { first_name: names[0], last_name: names.slice(1).join(' '), age: pd.age, gender: pd.gender },
             defaults: { username: pd.email.split('@')[0], email: pd.email }
           });
           
           const SmartDisease = require('../models/SmartDisease');
           const sd = await SmartDisease.findOrCreate({
             where: { disease_id: dId },
             defaults: { name: pd.group, description: pd.group }
           });
           
           await SmartPatientDisease.findOrCreate({
             where: { patient_id: sp[0].patient_id, disease_id: sd[0].disease_id }
           });
           
           const st = await SmartTreatment.findOrCreate({
             where: { name: mName, dosage: "Standard Dose" },
             defaults: { usage: 'Daily', clinicalMedicationId: mId }
           });

           const rate = Math.max(1, Math.min(5, Math.ceil((pd.recovery / 100) * 5)));
           
           await SmartImprovementRate.findOrCreate({
             where: {
               patient_id: sp[0].patient_id,
               treatment_id: st[0].treatment_id,
               doctor_id: doctor.id
             },
             defaults: { rate: rate, status: 'active', date: new Date().toISOString() }
           });
        }
      }

      // Skin Analyses (Cloudinary image)
      await Analysis.destroy({ where: { patientId: patient.id } });
      let uploadedImage;
      try {
        const uploadResult = await cloudinary.uploader.upload(WIKIMEDIA_IMAGE, { folder: 'dermalyze/demo-patient-analyses' });
        uploadedImage = uploadResult.secure_url;
      } catch (err) {
        console.error("Cloudinary failed, using mock URL:", err.message);
        uploadedImage = "https://via.placeholder.com/400x400.png?text=Skin+Scan";
      }

      // Visit 1
      await Analysis.create({
        patientId: patient.id,
        doctorId: doctor.id,
        imageUrl: uploadedImage,
        result: "Baseline scan",
        diagnosisLabel: pd.group,
        severity: "High",
        improvement: "0%",
        createdAt: new Date(Date.now() - 90 * 24*60*60*1000)
      });

      // Visit 2
      await Analysis.create({
        patientId: patient.id,
        doctorId: doctor.id,
        imageUrl: uploadedImage,
        result: "Follow up scan",
        diagnosisLabel: pd.group,
        severity: "Medium",
        improvement: "20%",
        createdAt: new Date(Date.now() - 40 * 24*60*60*1000)
      });

      // Visit 3
      await Analysis.create({
        patientId: patient.id,
        doctorId: doctor.id,
        imageUrl: uploadedImage,
        result: "Recent scan",
        diagnosisLabel: pd.group,
        severity: "Low",
        improvement: pd.recovery + "%",
        createdAt: new Date(Date.now() - 5 * 24*60*60*1000)
      });
    }

    console.log("SUCCESS! Seeding completed successfully.");
    process.exit(0);

  } catch (err) {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  }
}

run();
