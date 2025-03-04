const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for individual arrival records
const ArrivalSchema = new Schema({
  quantity: { type: Number, required: true },
  quantityType: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

// Schema for crops, including an array of arrival records
const CropSchema = new Schema({
  cropId: { type: String, required: true },
  cropName: { type: String, required: true },
  variantId: { type: String, required: true },
  variantName: { type: String, required: true },
  price: {
    min: { type: Number, required: true },
    modal: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  arrivals: [ArrivalSchema]  
});

// Main schema for mandi MarketPrice records, containing an array of crops
const MarketPriceSchema = new Schema({
  mandiId: { type: String, required: true },
  mandiName: { type: String, required: true },
  mandiType: { type: String, required: true },
  location: { type: String, required: true },
  crops: [CropSchema]
});

module.exports = mongoose.model('MarketPrice', MarketPriceSchema);
