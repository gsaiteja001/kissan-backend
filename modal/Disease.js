// models/Disease.js
const mongoose = require('mongoose');

const descriptionSchema = new mongoose.Schema({
    Title: { type: String, required: false },
    imageURL: { type: String, required: false },
    Content: { type: String, required: false },
}, { _id: false });

const controlMethodSchema = new mongoose.Schema({
    descriptions: { type: [descriptionSchema], default: [] },
    products: [{ type: String, required: false }],
}, { _id: false }); 

const diseaseSchema = new mongoose.Schema({
    DiseaseId: { type: String, required: false },
    Disease: { type: String, required: false },
    Symptoms: { type: String, required: false },
    Pathogen: { type: String, required: false },
    images: [{ type: String, required: false }],
    Favourable_Conditions: { type: String, required: false },
    Management: { type: String, required: false },
    Stages: { type: String, required: false },
    Cultural_Control: { type: [controlMethodSchema], default: [] },
    Chemical_Control: { type: [controlMethodSchema], default: [] },
    Biological_Control: { type: [controlMethodSchema], default: [] },
    Botanical_Control: { type: [controlMethodSchema], default: [] },
    Genetic_Resistance: { type: [controlMethodSchema], default: [] },
    Soil_Amendments: { type: [controlMethodSchema], default: [] },
    Trap_Methods: { type: [controlMethodSchema], default: [] },
    Preventive_Methods: { type: [controlMethodSchema], default: [] },
    Other_Methods: { type: [controlMethodSchema], default: [] },
    Viral_Phytoplasma_Disease_Control: { type: String, default: null },
    Title: { type: String, default: null },
    Mode_of_Spread_and_Survival: { type: String, required: false },
    crop: { type: String, required: false },
    cropId: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Disease', diseaseSchema);
