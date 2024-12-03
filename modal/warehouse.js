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

// Contact Schema for Staff
const contactSchema = new mongoose.Schema({
  phone: { type: String, required: false },
  email: { type: String, required: false },
});

// Staff Schema
const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      default: uuidv4, // Automatically generate UUIDv4
      unique: true,
      immutable: true,
    },
    name: { type: String, required: true },
    employeeId: { type: String, required: true },
    role: { type: String, required: true },
    contact: { type: contactSchema, required: false },
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'],
      required: true,
    },
  },
  { timestamps: true }
);

// Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema({
  sku: { type: String, required: false },
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
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // Reference to Warehouse
});

// Warehouse Schema
const warehouseSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      default: uuidv4, // Automatically generate UUIDv4
      unique: true,
      immutable: true,
    },
    warehouseName: { type: String, required: true },
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
    integrations: {
      erpSystem: { type: String }, // e.g., "SAP", "Oracle"
      crmSystem: { type: String }, // e.g., "Salesforce"
      otherSystems: [{ type: String }],
    },
    reportingAndAnalytics: {
      lastInventoryAudit: { type: Date },
      reportsGenerated: [{ type: String }], // e.g., "Monthly Stock Report"
    },
    staff: [staffSchema], // Integrated Staff Sub-schema
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

// Indexing warehouseId for faster queries and uniqueness
warehouseSchema.index({ warehouseId: 1 }, { unique: true });

// Export the Warehouse model
module.exports = mongoose.model('Warehouse', warehouseSchema);
