// models/CropTemplate.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschema for Crop Varieties
const CropVarietySchema = new Schema({
  varietyName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  idealPlantingSeason: {
    type: String,
    required: false,
    trim: true,
  },
  idealHarvestSeason: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Nutrients
const NutrientSchema = new Schema({
  nutrientName: {
    type: String,
    required: true,
    trim: true,
  },
  deficiencySymptoms: {
    type: String,
    required: false,
    trim: true,
  },
  correctionMethods: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Pests and Diseases
const PestDiseaseSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  symptoms: {
    type: String,
    required: false,
    trim: true,
  },
  prevention: {
    type: String,
    required: false,
    trim: true,
  },
  controlMethods: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Growth Stages
const GrowthStageSchema = new Schema({
  stageName: {
    type: String,
    required: true,
    trim: true,
  },
  durationWeeks: {
    type: Number,
    required: false,
    min: [0, 'Duration must be positive'],
  },
  activities: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Crop Growth Requirements
const CropGrowthRequirementsSchema = new Schema({
  soilType: {
    type: String,
    required: false,
    trim: true,
  },
  sunlight: {
    type: String,
    enum: ['Full Sun', 'Partial Shade', 'Shade'],
    required: false,
  },
  waterRequirement: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: false,
  },
  fertilizerNeeds: {
    type: String,
    required: false,
    trim: true,
  },
  nutrients: [NutrientSchema], // Added nutrients
  pestSusceptibility: {
    type: String,
    required: false,
    trim: true,
  },
  commonDiseases: [String],
  climateRequirements: {
    temperatureRange: {
      type: String,
      required: false,
      trim: true,
    },
    rainfall: {
      type: String,
      required: false,
      trim: true,
    },
    humidity: {
      type: String,
      required: false,
      trim: true,
    },
  },
  irrigation: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Crop Market Information
const CropMarketInfoSchema = new Schema({
  typicalPricePerUnit: {
    type: Number, // e.g., price per kilogram or ton
    required: false,
    min: [0, 'Price must be positive'],
  },
  marketDemand: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  primaryBuyers: [String], // e.g., ['Supermarkets', 'Local Markets', 'Exporters']
  yieldPerHectare: {
    type: Number, // Average yield per hectare
    required: false,
    min: [0, 'Yield must be positive'],
  },
});

// Main CropTemplate Schema
const CropTemplateSchema = new Schema(
  {
    cropId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    scientificName: {
      type: String,
      required: false,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    varieties: [CropVarietySchema], // Different varieties of the crop
    growthRequirements: CropGrowthRequirementsSchema, // Optimal growth conditions
    marketInfo: CropMarketInfoSchema, // Market-related information
    seasons: {
      planting: {
        type: String,
        required: false,
        trim: true,
      },
      harvest: {
        type: String,
        required: false,
        trim: true,
      },
    },
    totalPeriodWeeks: {
      type: Number, // Total period of crop in weeks
      required: false,
      min: [0, 'Total period must be positive'],
    },
    stages: [GrowthStageSchema], // Added stages
    equipmentsUsed: {
      type: [String], // List of equipments/tools required
      required: false,
    },
    landPreparation: {
      type: String, // Detailed steps for land preparation
      required: false,
      trim: true,
    },
    growthPromoters: {
      type: String, // Information on growth promoters
      required: false,
      trim: true,
    },
    pestsAndDiseases: [PestDiseaseSchema], // Added pests and diseases
    harvesting: {
      type: String, // Best practices for harvesting
      required: false,
      trim: true,
    },
    storage: {
      type: String, // Guidelines for storage post-harvest
      required: false,
      trim: true,
    },
    images: {
      type: [String], // URLs to crop images
      required: false,
    },
    localizedNames: {
      type: Map,
      of: String, // e.g., { "en": "Wheat", "hi": "गेहूँ" }
      required: false,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Indexes for Performance Optimization
CropTemplateSchema.index({ name: 1 });
CropTemplateSchema.index({ scientificName: 1 });
CropTemplateSchema.index({ 'growthRequirements.soilType': 1 });
CropTemplateSchema.index({ 'marketInfo.marketDemand': 1 });

// Virtuals for Computed Properties
CropTemplateSchema.virtual('fullDescription').get(function () {
  return `${this.name} (${this.scientificName}) - ${this.description}`;
});

// Pre-save Hook for Data Integrity
CropTemplateSchema.pre('save', function (next) {
  // Ensure cropId is a string
  if (this.cropId && typeof this.cropId !== 'string') {
    this.cropId = this.cropId.toString();
  }
  next();
});

// Method to Add a New Variety
CropTemplateSchema.methods.addVariety = function (varietyData) {
  this.varieties.push(varietyData);
  return this.save();
};

// Method to Remove a Variety by Variety Name
CropTemplateSchema.methods.removeVariety = function (varietyName) {
  this.varieties = this.varieties.filter((v) => v.varietyName !== varietyName);
  return this.save();
};

// Export the CropTemplate model
module.exports = mongoose.model('CropTemplate', CropTemplateSchema);
