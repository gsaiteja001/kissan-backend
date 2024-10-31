const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Subschema for Crop Inputs
const CropInputsSchema = new Schema({
  fertilizer: {
    type: String,
    required: false,
    trim: true,
  },
  pesticide: {
    type: String,
    required: false,
    trim: true,
  },
  seeds: {
    type: String,
    required: false,
    trim: true,
  },
  irrigationMethod: {
    type: String,
    enum: ['Drip', 'Sprinkler', 'Surface', 'None'],
    default: 'None',
  },
  otherInputs: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Crop Financials
const CropFinancialsSchema = new Schema({
  totalCost: {
    type: Number,
    default: 0,
  },
  revenue: {
    type: Number,
    default: 0,
  },
  profit: {
    type: Number,
    default: 0,
  },
  expenses: {
    type: Number,
    default: 0,
  },
});

// Subschema for Crop Services Used
const CropServiceSchema = new Schema({
  serviceProviderId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: false,
  },
  serviceType: {
    type: String,
    enum: ['Ploughing', 'Spraying', 'Transport', 'Irrigation'],
    required: true,
  },
  serviceDate: {
    type: Date,
    default: Date.now,
  },
  cost: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    required: false,
    trim: true,
  },
});

// Subschema for Crop Sales
const CropSaleSchema = new Schema({
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'Buyer',
    required: false,
  },
  quantity: {
    type: Number,
    required: true,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  notes: {
    type: String,
    required: false,
    trim: true,
  },
});

// Main Crop Schema
const CropSchema = new Schema({
  cropId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    index: true,
  },
  farmer: {
    type: Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  variety: {
    type: String,
    required: false,
    trim: true,
  },
  plantingDate: {
    type: Date,
    required: true,
    index: true,
  },
  expectedHarvestDate: {
    type: Date,
    required: false,
    index: true,
  },
  actualHarvestDate: {
    type: Date,
    required: false,
    index: true,
  },
  area: {
    type: Number, // in acres or hectares
    required: true,
    min: [0, 'Area must be positive'],
  },
  soilType: {
    type: String,
    required: false,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Planted', 'Growing', 'Harvested', 'Sold'],
    default: 'Planted',
    index: true,
  },
  yield: {
    type: Number, // in kilograms or tons
    required: false,
    min: [0, 'Yield must be positive'],
  },
  inputs: CropInputsSchema,
  financials: CropFinancialsSchema,
  servicesUsed: [CropServiceSchema],
  sales: [CropSaleSchema],
  notes: {
    type: String,
    required: false,
    trim: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Indexes for Performance Optimization
CropSchema.index({ farmer: 1, status: 1 });
CropSchema.index({ plantingDate: 1 });
CropSchema.index({ expectedHarvestDate: 1 });
CropSchema.index({ actualHarvestDate: 1 });
CropSchema.index({ name: 1, variety: 1 });

// Virtuals for Computed Properties
CropSchema.virtual('totalServicesCost').get(function () {
  return this.servicesUsed.reduce((total, service) => total + service.cost, 0);
});

CropSchema.virtual('totalSalesRevenue').get(function () {
  return this.sales.reduce((total, sale) => total + sale.totalPrice, 0);
});

CropSchema.virtual('netProfit').get(function () {
  return this.financials.revenue - this.financials.expenses;
});

// Pre-save Hook for Calculating Financials
CropSchema.pre('save', function (next) {
  // Calculate total expenses
  const totalServicesCost = this.servicesUsed.reduce((total, service) => total + service.cost, 0);
  const totalInputsCost = this.financials.expenses; // Assuming expenses include inputs
  this.financials.expenses = totalServicesCost + totalInputsCost;

  // Calculate revenue from sales
  const totalSalesRevenue = this.sales.reduce((total, sale) => total + sale.totalPrice, 0);
  this.financials.revenue = totalSalesRevenue;

  // Calculate profit
  this.financials.profit = this.financials.revenue - this.financials.expenses;

  // Update status based on dates
  if (this.actualHarvestDate) {
    this.status = 'Harvested';
  } else if (this.expectedHarvestDate && new Date() >= this.expectedHarvestDate) {
    this.status = 'Growing';
  }

  next();
});

// Method to Add a Service Used
CropSchema.methods.addService = function(serviceData) {
  this.servicesUsed.push(serviceData);
  return this.save();
};

// Method to Add a Sale
CropSchema.methods.addSale = function(saleData) {
  this.sales.push(saleData);
  return this.save();
};

// Method to Update Crop Status
CropSchema.methods.updateStatus = function(newStatus) {
  if (['Planted', 'Growing', 'Harvested', 'Sold'].includes(newStatus)) {
    this.status = newStatus;
    return this.save();
  } else {
    throw new Error('Invalid status');
  }
};

// Export the Crop model
module.exports = mongoose.model('Crop', CropSchema);
