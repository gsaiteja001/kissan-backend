// models/Supplier.js

const mongoose = require('mongoose');
const Product = require('./product'); 

// Sub-schemas for modularity and reusability

// Contact Information Sub-schema
const contactInfoSchema = new mongoose.Schema(
  {
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    website: { type: String },
    socialMedia: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
      // Add other social platforms as needed
    },
  },
  { _id: false }
);

// Product Reference Sub-schema using productId
const productReferenceSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    suppliedQuantity: { type: Number, default: 0, min: [0, 'Supplied quantity cannot be negative'] },
    leadTime: { type: String }, // e.g., "2-5 business days"
  },
  { _id: false }
);

// Certification Sub-schema
const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    authority: { type: String },
    dateObtained: { type: Date },
    validUntil: { type: Date },
  },
  { _id: false }
);

// Location Sub-schema with Geospatial Data
const locationSchema = new mongoose.Schema(
  {
    country: { type: String },
    state: { type: String },
    city: { type: String },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }, // [longitude, latitude]
    },
  },
  { _id: false }
);

// Business Details Sub-schema
const businessDetailsSchema = new mongoose.Schema(
  {
    establishedYear: { type: Number },
    numberOfEmployees: { type: Number },
    businessLicenseNumber: { type: String },
    taxID: { type: String },
  },
  { _id: false }
);

// Payment Terms Sub-schema
const paymentTermsSchema = new mongoose.Schema(
  {
    paymentMethods: [{ type: String, enum: ['Credit Card', 'Bank Transfer', 'PayPal', 'Cash', 'Other'] }],
    netTerms: { type: Number }, // e.g., Net 30
    currency: { type: String, default: 'USD' },
  },
  { _id: false }
);

// Delivery Options Sub-schema
const deliveryOptionsSchema = new mongoose.Schema(
  {
    shippingMethods: [{ type: String }], // e.g., Air, Ground, Sea
    deliveryAreas: [{ type: String }], // Regions or countries
    leadTime: { type: String }, // e.g., "2-5 business days"
  },
  { _id: false }
);

// Review Sub-schema
const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Inventory Sub-schema (unchanged)
const inventorySubSchema = new mongoose.Schema(
  {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    inventoryItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
  },
  { _id: false }
);

// Supplier Schema
const supplierSchema = new mongoose.Schema(
  {
    supplierId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    contactInfo: contactInfoSchema,

    supplierType: {
      type: String,
      enum: [
        'Fertilizer Supplier',
        'Tool Supplier',
        'Machinery Supplier',
        'Organic Products Supplier',
        'Chemical Supplier',
        'Pesticide Supplier',
        'Herbicide Supplier',
        'Gardening Supplies Supplier',
        'Seed Supplier',
        'Fungicide Supplier',
        'others',
      ],
      required: true,
    },

    productsSupplied: [productReferenceSchema], // Array of products with productId, suppliedQuantity, and leadTime

    certifications: [certificationSchema], // Supplier certifications

    location: locationSchema, // Supplier location with geospatial data

    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    reviews: [reviewSchema], // User reviews

    businessDetails: businessDetailsSchema,

    paymentTerms: paymentTermsSchema,

    deliveryOptions: deliveryOptionsSchema,

    inventory: [inventorySubSchema], // Inventory details per warehouse

    notes: { type: String }, // Any additional notes about the supplier

    // Timestamps
  },
  { timestamps: true }
);

// Adding geospatial index for location
supplierSchema.index({ 'location.coordinates': '2dsphere' });

// Indexing productId within productsSupplied for faster queries
supplierSchema.index({ 'productsSupplied.productId': 1 });

// Virtual field to populate inventory items if needed
supplierSchema.virtual('populatedInventoryItems', {
  ref: 'InventoryItem',
  localField: 'inventory.inventoryItems',
  foreignField: '_id',
  justOne: false,
});

// Ensure virtual fields are included when converting to JSON or Object
supplierSchema.set('toObject', { virtuals: true });
supplierSchema.set('toJSON', { virtuals: true });

// Middleware to update ratings based on reviews
supplierSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / this.reviews.length;
    this.ratings.count = this.reviews.length;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }
  next();
});

// Middleware to ensure productsSupplied references are valid based on productId
supplierSchema.pre('save', async function (next) {
  try {
    const productIds = this.productsSupplied.map((p) => p.productId);
    const existingProducts = await Product.find({ productId: { $in: productIds } }).select('productId');
    const existingProductIds = existingProducts.map((p) => p.productId);

    const invalidProductIds = productIds.filter((id) => !existingProductIds.includes(id));
    if (invalidProductIds.length > 0) {
      return next(new Error(`Products with productId(s) ${invalidProductIds.join(', ')} do not exist.`));
    }

    next();
  } catch (error) {
    next(error);
  }
});




/**
 * Add a single product to productsSupplied
 * @param {String} productId - The unique identifier of the product
 * @param {Number} suppliedQuantity - Quantity supplied
 * @param {String} leadTime - Lead time for the product
 */
supplierSchema.methods.addProduct = async function (productId, suppliedQuantity, leadTime) {
  // Check if the product exists
  const productExists = await Product.exists({ productId });
  if (!productExists) {
    throw new Error(`Product with productId ${productId} does not exist.`);
  }

  // Check if the product is already supplied
  const existingProduct = this.productsSupplied.find((p) => p.productId === productId);
  if (existingProduct) {
    // Update suppliedQuantity and leadTime
    existingProduct.suppliedQuantity = suppliedQuantity;
    existingProduct.leadTime = leadTime;
  } else {
    // Add new product
    this.productsSupplied.push({ productId, suppliedQuantity, leadTime });
  }

  await this.save();
};



/**
 * Remove a single product from productsSupplied
 * @param {String} productId - The unique identifier of the product
 */
supplierSchema.methods.removeProduct = async function (productId) {
  const initialLength = this.productsSupplied.length;
  this.productsSupplied = this.productsSupplied.filter((p) => p.productId !== productId);
  if (this.productsSupplied.length === initialLength) {
    throw new Error(`Product with productId ${productId} not found in supplier's products.`);
  }
  await this.save();
};



module.exports = mongoose.model('Supplier', supplierSchema);
