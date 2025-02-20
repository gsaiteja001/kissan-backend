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
    showcaseId: [{ type: String }],
    linkedSuppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }],
    integrations: {
      erpSystem: { type: String }, 
      crmSystem: { type: String },
      otherSystems: [{ type: String }],
    },
    reportingAndAnalytics: {
      lastInventoryAudit: { type: Date },
      reportsGenerated: [{ type: String }],
    },
    staff: [staffSchema],
    archived: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
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

// Create 2dsphere index on location
warehouseSchema.index({ location: '2dsphere' });

// Export the Warehouse model
module.exports = mongoose.model('Warehouse', warehouseSchema);
