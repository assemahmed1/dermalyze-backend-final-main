const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Patient = require('../models/Patient');
const Medication = require('../models/Medication');
const { sequelize } = require('../config/db');

// GET /smart-history/patients?doctor_id=1&disease=Eczema
router.get('/patients', async (req, res) => {
  try {
    const doctor_id = req.query.doctor_id;
    const disease = req.query.disease;

    if (!doctor_id || !disease) {
      return res.status(400).json({ status: 'error', message: 'doctor_id and disease are required' });
    }

    // In our schema, patients have a direct 'diagnosis' string field and a 'doctorId'
    const patients = await Patient.findAll({
      where: {
        doctorId: doctor_id,
        diagnosis: {
          [Op.like]: `%${disease}%`
        }
      },
      attributes: ['id', 'name', 'age', 'gender', 'nationalId', 'phone', 'address', 'diagnosis', 'status', 'recoveryProgress', 'createdAt']
    });

    res.json({
      status: 'success',
      doctor_id,
      disease,
      results_count: patients.length,
      patients
    });

  } catch (error) {
    console.error('[SMART HISTORY PATIENTS ERROR]', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /smart-history/treatments?doctor_id=1&disease=Eczema
router.get('/treatments', async (req, res) => {
  try {
    const doctor_id = req.query.doctor_id;
    const disease = req.query.disease;

    if (!doctor_id || !disease) {
      return res.status(400).json({ status: 'error', message: 'doctor_id and disease are required' });
    }

    // In our schema:
    // - Medications table acts as Treatments. It has name, dosage, frequency (acts as usage)
    // - Improvement Rate is stored in Patient.recoveryProgress
    // - We join Medication with Patient to filter by disease and calculate average recovery rate
    const treatments = await Medication.findAll({
      where: {
        doctorId: doctor_id
      },
      include: [{
        model: Patient,
        as: 'patient',
        where: {
          diagnosis: {
            [Op.like]: `%${disease}%`
          }
        },
        attributes: [] // Don't return patient attributes, just use for joining & aggregating
      }],
      attributes: [
        'name',
        'dosage',
        ['frequency', 'usage'],
        [sequelize.fn('AVG', sequelize.col('patient.recoveryProgress')), 'average_rate'],
        [sequelize.fn('COUNT', sequelize.col('patient.id')), 'total_ratings']
      ],
      group: ['name', 'dosage', 'frequency'],
      order: [[sequelize.literal('average_rate'), 'DESC']]
    });

    res.json({
      status: 'success',
      doctor_id,
      disease,
      results_count: treatments.length,
      treatments
    });

  } catch (error) {
    console.error('[SMART HISTORY TREATMENTS ERROR]', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
