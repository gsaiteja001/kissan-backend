// models/Warehouse.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); 

// Address Schema
const addressSchema = new mongoose.Schema({
  street: { type: String, required: false },
  area: { type: String },
  city: { type: String, required: false },
  state: { type: String, required: false },
  postalCode: { type: String },
  country: { type: String, required: false },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
});

// Staff Schema
const staffSchema = new mongoose.Schema({
  name: { type: String, required: false },
  role: { type: String, required: false }, // e.g., Manager, Worker, Supervisor
  contactInfo: {
    phone: { type: String },
    email: { type: String },
  },
  employeeId: { type: String, unique: true },
  shift: { type: String }, // e.g., Day, Night
});

// Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema({
  sku: { type: String, required: false, unique: true },
  productName: { type: String, required: false },
  category: {
    type: String,
    enum: [
      'Fertilizer',
      'Pesticide',
      'Farming Tool',
      'Herbicide',
      'Growth Promoter',
      'Nutrient',
      'Seed',
      'Equipment',
      'Machinery',
      'others',
    ],
    required: false,
  },
  quantity: { type: Number, required: false, min: 0 },
  unit: { type: String, default: 'kg' }, // or 'liters', 'units', etc.
  storageLocation: {
    aisle: { type: String },
    shelf: { type: String },
    bin: { type: String },
  },
  temperatureControlRequired: { type: Boolean, default: false },
  specialHandling: { type: String }, // e.g., "Keep away from sunlight"
  expirationDate: { type: Date },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  costPrice: { type: Number },
  sellingPrice: { type: Number },
  reorderLevel: { type: Number, default: 10 }, // Alert when stock is below this level
  batchNumber: { type: String },
  manufacturingDate: { type: Date },
});

// Warehouse Schema
const warehouseSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      default: uuidv4, // Automatically generate UUIDv4
      unique: true, // Ensure uniqueness
      immutable: true, // Prevent modification once set
    },
    warehouseName: { type: String, required: false, unique: true },
    address: { type: addressSchema, required: false },
    contactInfo: {
      phone: { type: String, required: false },
      email: { type: String, required: false },
      contactPerson: { type: String, required: false },
    },
    storageCapacity: { type: Number, required: false }, // in cubic meters or square meters
    currentOccupancy: { type: Number, default: 0 }, // Calculated based on inventory
    inventoryManagementSystem: {
      type: String,
      enum: ['FIFO', 'LIFO', 'FEFO'], // FEFO: First Expire, First Out
      default: 'FIFO',
    },
    // Removed the embedded inventoryItems field
    staff: [staffSchema],
    securityMeasures: {
      cctv: { type: Boolean, default: true },
      accessControl: { type: Boolean, default: true },
      securityPersonnel: { type: Boolean, default: false },
      alarmSystem: { type: Boolean, default: false },
    },
    operationalHours: {
      open: { type: String, default: '08:00 AM' },
      close: { type: String, default: '06:00 PM' },
    },
    temperatureControlled: { type: Boolean, default: false },
    maintenanceSchedule: [
      {
        maintenanceType: { type: String }, // e.g., Equipment Check, Pest Control
        scheduledDate: { type: Date },
        completed: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    complianceCertificates: [
      {
        certificateName: { type: String },
        issuedBy: { type: String },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        certificateNumber: { type: String },
      },
    ],
    linkedSuppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }],
    linkedCustomers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' }],
    linkedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    integrations: {
      erpSystem: { type: String }, // e.g., "SAP", "Oracle"
      crmSystem: { type: String }, // e.g., "Salesforce"
      otherSystems: [{ type: String }],
    },

    reportingAndAnalytics: {
      lastInventoryAudit: { type: Date },
      reportsGenerated: [{ type: String }], // e.g., "Monthly Stock Report"
    },
    archived: { type: Boolean, default: false }, // Soft delete mechanism
  },
  { timestamps: true }
);

// Add virtual field for inventory items
warehouseSchema.virtual('inventoryItems', {
  ref: 'InventoryItem',
  localField: '_id',
  foreignField: 'warehouse',
});

// Ensure virtual fields are included when converting to JSON or Object
warehouseSchema.set('toObject', { virtuals: true });
warehouseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
