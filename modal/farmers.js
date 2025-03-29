const mongoose = require('mongoose'); 
const { Schema } = mongoose;

// Updated Subschema for Location (GeoJSON Point)
const LocationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number], 
    required: true,
  },
});

// Subschema for Address
const AddressSchema = new Schema({
  street: { type: String, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  postalCode: { type: String, required: false },
  country: { type: String, required: false },
  location: {
    type: LocationSchema, 
    required: true, 
  },
});


// Updated Subschema for Farm Details
const FarmDetailsSchema = new Schema({
  farmId: { type: String, required: false },
  farmName: { type: String, required: true },
  area: { type: Number, required: false }, // in acres or hectares
  soilType: { type: String, required: false },

  surveyNumber: { type: String, required: false },

  // Existing area field
  farmersEstarea: { type: Number, required: false }, 

  // <--- New field for tracking the unit of area
  farmersEstareaUnit: {
    type: String,
    enum: ['acres', 'hectares'],
    default: 'acres',
    required: false,
  },

  // Additional fields
  revenueVillage: { type: String, required: false },
  mandal: { type: String, required: false },

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
    required: true,
    validate: {
      validator: function(v) {
        // 'this' refers to the current crop document
        // 'this.parent()' refers to the farmer document
        return this.parent().farms.some(farm => farm.farmId === v);
      },
      message: props => `Farm ID '${props.value}' does not exist in the farmer's farms.`,
    },
  },
  
  area: { type: Number, required: false }, // in sq meters
  soilType: { type: String, required: false },
  individualProgress: { type: Number, required: false },
});

const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  variant: { type: Object, required: false, default: null },
  basePrice: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  deliveryInfo: { type: Object, required: true, default: null },
});

// Enumerations for User Types and Subcategories
const USER_TYPES = ['farmer', 'gardener', 'animalHusbandry'];

const FARMER_CATEGORIES = [
  'Subsistence/Backyard Farmer',
  'Commercial Farmer',
  'Mixed Farmer',
  'Plantation Farmer',
  'Cooperative Farmer'
];

const GARDENER_CATEGORIES = [
  'Rooftop Vegetable Planter',
  'Balcony Planter',
  'Home Decor Planter'
];

const GARDENER_EXPERIENCES = ['Newbie', 'Seasonal', 'Passionate'];
const GARDENER_CHOICES = ['Organic', 'Hybrid'];

const ANIMAL_HUSBANDRY_CATEGORIES = ['Cattle', 'Poultry', 'Fishery'];

// Subschema for Farmer Details
const FarmerTypeDetailsSchema = new Schema({
  categories: {
    type: [String],
    enum: FARMER_CATEGORIES,
  },
  fertilizerChoice: {
    type: String,
    enum: ['Organic', 'Hybrid'],
    required: false
  }
}, { _id: false });

// Subschema for Gardener Details
const GardenerTypeDetailsSchema = new Schema({
  categories: {
    type: [String],
    enum: GARDENER_CATEGORIES,
  },
  userExperience: {
    type: String,
    enum: GARDENER_EXPERIENCES,
  },
  userChoice: {
    type: String,
    enum: GARDENER_CHOICES,
  }
}, { _id: false });

// Subschema for Animal Husbandry Details
const AnimalHusbandryTypeDetailsSchema = new Schema({
  categories: {
    type: [String],
    enum: ANIMAL_HUSBANDRY_CATEGORIES,
  },
  breedName: {
    type: String,
    required: false,
    trim: true
  }
}, { _id: false });

// 1. Define the SubscriptionSchema
const SubscriptionSchema = new Schema({
  subscriptionId: { type: String, required: false },
  planType: { 
    type: String, 
    enum: ['gold', 'silver', 'free-trial'], // Added 'free-trial'
    required: true,
    lowercase: true,
    trim: true
  },
   price: { 
    type: Number, 
    required: false
  },
  discount: { 
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  duration: { 
    type: String, 
    enum: ['monthly', '3_month', '6_month', '1_year', '30_days'], // Added '30 days'
    required: function() {
      return this.planType !== 'free-trial'; // Duration not required for free-trial
    }
  },
  startDate: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled'], 
    default: 'active' 
  },
  amountPaid: { type: String, required: false },
  details: { type: String, required: false },
}, { _id: false });

// 2. Middleware to calculate endDate based on duration and plan
SubscriptionSchema.pre('validate', function(next) {
  if (this.startDate) {
    let endDate = new Date(this.startDate);
    
    if (this.planType === 'free-trial') {
      // Fixed duration of 30 days for free-trial
      endDate.setDate(endDate.getDate() + 30);
      this.duration = '30_days'; // Ensure consistency with enum
      this.price = 0; // Ensure price is 0 for free-trial
    } else if (this.duration) {
      switch (this.duration) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case '3_month':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case '6_month':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case '1_year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case '30_days':
          endDate.setDate(endDate.getDate() + 30);
          break;
        default:
          break;
      }
    }
    this.endDate = endDate;
  }
  next();
});

// Subschema for Current Service Requests
const CurrentServiceRequestSchema = new Schema({
  requestID: { type: String, required: true },
  serviceID: { type: String, required: true },
  serviceProviderID: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'InProgress', 'Assigned'], // Define appropriate statuses
    required: true 
  },
  scheduledDate: { type: Date, required: true },
}, { _id: false });


// Subschema for Completed Service Requests
const CompletedServiceRequestSchema = new Schema({
  requestID: { type: String, required: true },
  serviceID: { type: String, required: true },
  serviceProviderID: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Completed', 'Cancelled'], 
    required: true 
  },
  scheduledDate: { type: Date, required: true },
}, { _id: false });


// Subschema for Search History
const SearchHistorySchema = new Schema({
  query: { type: String, required: true }, 
  category: { 
    type: String,
    enum: [
      'Crops', 
      'Farming Tools', 
      'Services', 
      'Suppliers', 
      'Market', 
      'Other',
      'Pesticides', 
      'Insecticides', 
      'Fungicides', 
      'Farm Machinery', 
      'Bio-Pesticides', 
      'Seeds', 
      'Brands', 
      'Soil', 
      'Garden Tools', 
      'Growth Promoters', 
      'Herbicides', 
      'Nutrients', 
      'Pots', 
      'Growbags', 
      'Herbs', 
      'Houseplants', 
      'Tools',
      ''
    ],
    required: false, 
  }, 
  searchDate: { type: Date, default: Date.now, required: true }, 
  location: { 
    type: LocationSchema, 
    required: false,
  },
  resultsCount: { 
    type: Number, 
    required: false, 
    default: 0, 
  },
  additionalInfo: { 
    type: String, 
    required: false, 
  }, 
});



// Main Farmer Schema with Upgraded Features
const FarmerSchema = new Schema({
  farmerId: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true, trim: true }, 
  profilePicture: { type: String, required: false },
  phoneNumber: { type: String, required: true },
  cartItems: { type: [CartItemSchema], required: false, default: [] },
  address: AddressSchema,
  location: LocationSchema,
  farms: { type: [FarmDetailsSchema], required: false },
  userSubscriptions: { 
    type: [SubscriptionSchema], 
    required: false, 
    default: [] 
  },
  wallet: {
    balance: { type: Number, default: 0, required: false },
    currency: { type: String, default: 'RUPEE', required: false },
  },
  searchHistory: { 
    type: [SearchHistorySchema], 
    required: false, 
    default: [] 
  },
  financialStatus: { type: FinancialStatusSchema, required: false },
  ProviderID: { type: String, required: false, unique: true, trim: true },
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

  currentServiceRequests: { 
    type: [CurrentServiceRequestSchema], 
    required: false,
    default: [] 
  },
  completedServiceRequests: { 
    type: [CompletedServiceRequestSchema], 
    required: false,
    default: [] 
  },
  
  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended', 'Deactivated'],
    default: 'Active',
    required: false,
  },
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    required: false,
  },
  userTypes: {
    type: [String],
    enum: USER_TYPES,
    required: false,
  },
  aadharNumber: { type: String, required: false },
  aadharVerificationStatus: {
    type: String,
    enum: ['Verified', 'Not Verified', 'Pending', 'Invalid'],
    default: 'Not Verified',
    required: false,
  },
  farmerDetails: FarmerTypeDetailsSchema,
  gardenerDetails: GardenerTypeDetailsSchema,
  animalHusbandryDetails: AnimalHusbandryTypeDetailsSchema,

  currentOrders: [{ type: String, ref: 'Order', required: false }], // Orders that are not yet delivered or completed
  completedOrders: [{ type: String, ref: 'Order', required: false }], // Orders that are delivered
  returnedOrders: [{ type: String, ref: 'Order', required: false }],
  
  createdAt: { type: Date, default: Date.now, required: false },
});

// Virtuals for computed properties
FarmerSchema.virtual('fullAddress').get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state}, ${this.address.country}`;
});



// Export the Farmer model
module.exports = mongoose.model('Farmer', FarmerSchema);
