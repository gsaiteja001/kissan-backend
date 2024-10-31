// models/Disease.js
const mongoose = require('mongoose');

// Remedy Schema for chemical remedies
const RemedySchema = new mongoose.Schema({
  product: { type: String, required: false },
  brand: { type: String }
}, { _id: false });

// Chemical Remedies Schema
const ChemicalRemediesSchema = new mongoose.Schema({
  fungicides: [RemedySchema],
  bactericides: [RemedySchema],
  insecticides: [RemedySchema],
  miticides: [RemedySchema]
}, { _id: false });

// Organic Remedies Schema
const OrganicRemediesSchema = new mongoose.Schema({
  products: [
    {
      name: { type: String, required: false },
      product: { type: String, required: false }
    }
  ]
}, { _id: false });


const PreventionSchema = new mongoose.Schema({
  cultural_practices: [{ type: String }]
}, { _id: false });


const DiseaseSchema = new mongoose.Schema({
  cropname: { type: String, required: true },
  id: { type: Number, required: false },
  name: { type: String, required: false },
  description: { type: String, required: false },
  prevention: PreventionSchema,
  chemical_remedies: ChemicalRemediesSchema,
  application_steps: [{ type: String }],
  organic_remedies: OrganicRemediesSchema,
  organic_application_steps: [{ type: String }]
}, { timestamps: false });


const cropDisease = mongoose.model('cropDisease', DiseaseSchema);

module.exports = cropDisease;
