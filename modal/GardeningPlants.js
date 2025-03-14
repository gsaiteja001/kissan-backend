const mongoose = require('mongoose');

// Schema for additional_info objects
const AdditionalInfoSchema = new mongoose.Schema({
  title: { type: String, required: false },
  imageURL: { type: String, required: false },
  Description: { type: String },
  tags: [{ type: String }]
});

// Schema for growth properties
const GrowthPropertiesSchema = new mongoose.Schema({
  spacings: { type: String },
  depth: { type: String },
  sunlight: { type: String },
  water_schedule: { type: String },
  season: { type: String },
  frost: { type: String },
  germinationTime: { type: String },
  sproutToharvestTime: { type: String },
  soilpH: { type: String }
});

// Schema for nutrition information
const NutritionSchema = new mongoose.Schema({
  Vitamins: [{ type: String }],
  Nutrients: [{ type: String }]
});

// Schema for pests
const PestSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String }
});

// Schema for diseases
const DiseaseSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String }
});

// Schema for variety objects
const VarietySchema = new mongoose.Schema({
  VarietyId: { type: String, required: false },
  name: { type: String, required: false },
  Description: { type: String },
  imageUrl: [{ type: String }],
  additional_info: [AdditionalInfoSchema]
});

// Main Plant schema
const GardeningPlantSchema = new mongoose.Schema({
    GardeningPlantId: { type: String, required: false },
  Name: { type: String, required: false },
  scientificName: { type: String }, 
  category: { type: String },       
  subCategory: { type: String },      
  taggedCategory: { type: String },    
  region: { type: String },
  favourableConditions: { type: String },
  images: [{ type: String }],              
  growth_properties: GrowthPropertiesSchema,
  GrowingCalender: { type: String }, 
  companionPlants: [{ type: String }],
  combativeplants: [{ type: String }],
  Nutrition: NutritionSchema,
  pests: [PestSchema],
  diseases: [DiseaseSchema],
  additional_info: [AdditionalInfoSchema],
  varieties: [VarietySchema]  // Array of variety objects
});

module.exports = mongoose.model('GardeningPlant', GardeningPlantSchema);
