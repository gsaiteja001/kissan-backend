const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschema for Address
const AddressSchema = new Schema({
  street: { type: String, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  postalCode: { type: String, required: false },
  country: { type: String, required: false },
});


// Updated Subschema for Location (GeoJSON Point)
const LocationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude, elevation (optional)]
    required: true,
  },
});

// Updated Subschema for Farm Details
const FarmDetailsSchema = new Schema({
  farmId: { type: String, required: false },
  area: { type: Number, required: false }, // in acres or hectares
  soilType: { type: String, required: false },
  farmType: {
    type: String,
    enum: ['FullTimeFarmer', 'PartTimeFarmer', 'Planter'],
    default: 'FullTimeFarmer',
    required: false,
  },
  farmingCapacity: {
    type: String,
    enum: ['Large', 'Medium', 'Small'],
    default: 'Small',
    required: false,
  },
  location: LocationSchema, // Farm location as a GeoJSON Point
  surveyNumber: { type: String, required: false },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
      required: true,
    },
    coordinates: {
      type: [[[Number]]], // [[[longitude, latitude, elevation], ...], ...]
      required: true,
    },
  },
});

// Subschema for Financial Status
const FinancialStatusSchema = new Schema({
  income: { type: Number, default: 0, required: false }, // Annual income
  profit: { type: Number, default: 0, required: false },
  debt: { type: Number, default: 0, required: false },
});

// Subschema for Transactions
const TransactionSchema = new Schema({
  transactionId: { type: String, required: false },
  type: { type: String, required: false }, // e.g., 'Credit', 'Debit'
  description: { type: String, required: false },
  amount: { type: Number, required: false },
  date: { type: Date, default: Date.now, required: false },
});

// Subschema for Selling Items
const SellingItemSchema = new Schema({
  itemId: { type: String, required: false },
  name: { type: String, required: false },
  category: { type: String, required: false },
  quantity: { type: Number, required: false },
  price: { type: Number, required: false },
  description: { type: String, required: false },
  postedDate: { type: Date, default: Date.now, required: false },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Pending'],
    default: 'Available',
    required: false,
  },
});

// Subschema for Bought Items
const BoughtItemSchema = new Schema({
  itemId: { type: String, required: false },
  name: { type: String, required: false },
  category: { type: String, required: false },
  quantity: { type: Number, required: false },
  price: { type: Number, required: false },
  purchaseDate: { type: Date, default: Date.now, required: false },
});

const RatingSchema = new Schema({
  serviceProviderId: { type: String, required: false },
  rating: { type: Number, min: 1, max: 5, required: false },
  review: { type: String, required: false },
  date: { type: Date, default: Date.now, required: false },
});

const CertificationSchema = new Schema({
  name: { type: String, required: false },
  issuingAuthority: { type: String, required: false },
  issueDate: { type: Date, required: false },
  expirationDate: { type: Date, required: false },
  documentUrl: { type: String, required: false },
});

const PaymentMethodSchema = new Schema({
  type: { type: String, enum: ['BankTransfer', 'MobilePayment', 'Cash', 'Other'], required: false },
  details: { type: String, required: false },
});

const NotificationPreferencesSchema = new Schema({
  sms: { type: Boolean, default: false, required: false },
  inApp: { type: Boolean, default: true, required: false },
});


const RecommendedProductSchema = new Schema({
  productId: { type: String, required: false },
  productName: { type: String, required: false },
  description: { type: String, required: false },
});

const RecommendedServiceSchema = new Schema({
  serviceId: { type: String, required: false },
  serviceName: { type: String, required: false },
  description: { type: String, required: false },
});

const FinancierSchema = new Schema({
  financierId: { type: String, required: false },
  financierName: { type: String, required: false },
  contactInfo: { type: String, required: false },
});

const CropDetailsSchema = new Schema({
  cropId: { type: String, required: false, trim: true },
  name: { type: String, required: false, trim: true },
  variety: { type: String, required: false, trim: true },
  plantingDate: { type: Date, required: false },
  expectedHarvestDate: { type: Date, required: false },
  actualHarvestDate: { type: Date, required: false },
  fertilizerUsed: { type: [String], required: false },
  pesticidesUsed: { type: [String], required: false },
  irrigationMethod: {
    type: String,
    enum: ['Drip', 'Sprinkler', 'Surface', 'None'],
    default: 'None',
    required: false,
  },
  status: {
    type: String,
    enum: ['Planted', 'Growing', 'Harvested'],
    default: 'Planted',
    required: false,
  },
  yield: { type: Number, required: false }, 
  notes: { type: String, required: false, trim: true },

  // New Fields
  recommendProducts: {
    type: [RecommendedProductSchema],
    required: false,
  },
  recommendServices: {
    type: [RecommendedServiceSchema],
    required: false,
  },
  harvestSoldPrice: {
    type: Number, 
    required: false,
  },
  harvestSoldPlace: {
    type: String,
    required: false,
  },
  financier: FinancierSchema, // Single financier details
  recommendFinancier: {
    type: [FinancierSchema], // Array of recommended financiers
    required: false,
  },

  farmId: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(value) {
        // 'this' refers to the current crop document
        return this.ownerDocument().farms.some(farm => farm.farmId === value);
      },
      message: props => `Farm ID '${props.value}' does not exist in the farmer's farms.`,
    },
  },
  area: { type: Number, required: false }, // in sq meters
  soilType: { type: String, required: false },
  individualProgress: { type: Number, required: false },
});



// Main Farmer Schema
const FarmerSchema = new Schema({
  farmerId: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true, trim: true }, 
  profilePicture: { type: String, required: false },
  phoneNumber: { type: String, required: true }, 
  address: AddressSchema,
  location: LocationSchema,
  farms: { type: [FarmDetailsSchema], required: false },
  wallet: {
    balance: { type: Number, default: 0, required: false },
    currency: { type: String, default: 'RUPEE', required: false },
  },
  financialStatus: { type: FinancialStatusSchema, required: false },
  subscriptions: [
    {
      subscriptionId: { type: String, required: false },
      details: { type: String, required: false },
      period: { type: String, required: false },
      startDate: { type: Date, default: Date.now, required: false },
    },
  ],
  availableLandForRent: { type: Boolean, default: false, required: false },
  rentedLandDetails: [
    {
      landId: { type: String, required: false },
      size: { type: Number, required: false },
      location: { type: String, required: false }, 
      rentStartDate: { type: Date, required: false },
      rentEndDate: { type: Date, required: false },
    },
  ],
  transactions: { type: [TransactionSchema], required: false },
  groupsInvolved: [
    {
      groupId: { type: String, required: false },
      role: {
        type: String,
        enum: ['Member', 'Admin'],
        default: 'Member',
        required: false,
      },
      joinedDate: { type: Date, default: Date.now, required: false },
    },
  ],
  postedSellingItems: { type: [SellingItemSchema], required: false },
  boughtItems: { type: [BoughtItemSchema], required: false },
  ratings: { type: [RatingSchema], required: false },
  certifications: { type: [CertificationSchema], required: false },
  preferredPaymentMethods: { type: [PaymentMethodSchema], required: false },
  notificationPreferences: { type: NotificationPreferencesSchema, required: false },
  currentCrops: { type: [CropDetailsSchema], required: false },
  completedCrops: { type: [CropDetailsSchema], required: false },
  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended', 'Deactivated'],
    default: 'Active',
    required: false,
  },
  profileCompleteness: {
    type: Number,
    default: 0, // Percentage
    min: 0,
    max: 100,
    required: false,
  },
  createdAt: { type: Date, default: Date.now, required: false },
});

// Virtuals for computed properties
FarmerSchema.virtual('fullAddress').get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state}, ${this.address.country}`;
});

// Export the Farmer model
module.exports = mongoose.model('Farmer', FarmerSchema);
