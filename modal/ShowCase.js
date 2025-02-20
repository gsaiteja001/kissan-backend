const mongoose = require('mongoose');

const showcaseCategorySchema = new mongoose.Schema(
  {
    showcaseCategoryId: { type: String },
    name: { type: String },
  },
  { _id: false } 
);

const showCaseSchema = new mongoose.Schema({
    showcaseId: { type: String },
  headerImage: { type: String },
  backgroundImage: { type: String },
  productBackgroundImage: { type: String },
  productBaseImage: { type: String },
  productTopanimations: [{ type: String }], 
  headerAnimations: [{ type: String }],   
  productIds: [{ type: String }],  
  productsSlots: [{ type: String }],           
  showcaseCategory: showcaseCategorySchema,    
  productClicks: { type: Number, default: 0 },
  createdDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  cost: { type: Number },
});

module.exports = mongoose.model('ShowCase', showCaseSchema);
