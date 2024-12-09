const mongoose = require('mongoose');
const LocalizedStringSchema = require('./LocalizedString'); 

// Description Schema with Multilingual Support
const descriptionSchema = new mongoose.Schema({
    Title: { type: LocalizedStringSchema, required: true },
    imageURL: { type: String, required: false },
    Content: { type: LocalizedStringSchema, required: true },
}, { _id: false });

// Control Method Schema
const controlMethodSchema = new mongoose.Schema({
    descriptions: { type: [descriptionSchema], default: [] },
    products: [{ type: String, required: false }],
}, { _id: false });

// Disease Schema with Multilingual Fields
const diseaseSchema = new mongoose.Schema({
    DiseaseId: { type: String, required: false },
    
    // Multilingual Fields
    Disease: { type: LocalizedStringSchema, required: false },
    Symptoms: { type: LocalizedStringSchema, required: false },
    Favourable_Conditions: { type: LocalizedStringSchema, required: false },
    Management: { type: LocalizedStringSchema, required: false },
    Stages: { type: LocalizedStringSchema, required: false },
    Title: { type: LocalizedStringSchema, required: false },
    Mode_of_Spread_and_Survival: { type: LocalizedStringSchema, required: false },
    Viral_Phytoplasma_Disease_Control: { type: LocalizedStringSchema, required: false },
    
    // Control Methods (Nested Multilingual Fields)
    Cultural_Control: { type: [controlMethodSchema], default: [] },
    Chemical_Control: { type: [controlMethodSchema], default: [] },
    Biological_Control: { type: [controlMethodSchema], default: [] },
    Botanical_Control: { type: [controlMethodSchema], default: [] },
    Genetic_Resistance: { type: [controlMethodSchema], default: [] },
    Soil_Amendments: { type: [controlMethodSchema], default: [] },
    Trap_Methods: { type: [controlMethodSchema], default: [] },
    Preventive_Methods: { type: [controlMethodSchema], default: [] },
    Other_Methods: { type: [controlMethodSchema], default: [] },
    
    // Other Fields
    Pathogen: { type: String, required: false },
    images: [{ type: String, required: false }],
    crop: { type: String, required: false },
    cropId: { type: String, unique: true, required: false },
}, { timestamps: true });

module.exports = mongoose.model('multilangDisease', diseaseSchema);
