
const mongoose = require('mongoose'); 
const InventoryItem = require('./InventoryItem');
const LocalizedStringSchema = require('./LocalizedString'); 

// Review Schema
const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: false,
      trim: true,
    },
    rating: {
      type: Number,
      required: false,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Variant Schema
const VariantSchema = new mongoose.Schema(
   {
    variantId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
      // enum: ['500 ml', '1 liter', '2 liters', '1 kg', '5 kg', '20 kg']
    },
    sku: {
      type: String,
      unique: true,
      required: false,
      trim: true,
    },
    price: {
      type: Number,
      required: false,
      min: [0, 'Price cannot be negative'],
    },
    finalPrice: {
      type: Number,
      min: [0, 'Final price cannot be negative'],
    },
    // Remove stockQuantity from here
    discount: {
      amount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative'],
        default: 0,
      },
      discountType: {
        type: String,
        enum: ['Amount', 'Percentage'],
        default: 'Amount',
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
    },
    dimensions: {
      length: { type: Number, min: [0, 'Length cannot be negative'] },
      width: { type: Number, min: [0, 'Width cannot be negative'] },
      height: { type: Number, min: [0, 'Height cannot be negative'] },
    },
    // Add other variant-specific fields as needed
  },
  { timestamps: true }
);

// Pre-save middleware to calculate finalPrice for variants
VariantSchema.pre('save', function (next) {
  const now = new Date();
  const discount = this.discount;
  let finalPrice = this.price;

  // Check if discount is applicable
  const isDiscountValid =
    discount &&
    discount.amount > 0 &&
    (!discount.startDate || discount.startDate <= now) &&
    (!discount.endDate || discount.endDate >= now);

  if (isDiscountValid) {
    if (discount.discountType === 'Percentage') {
      finalPrice = this.price - (this.price * discount.amount) / 100;
    } else if (discount.discountType === 'Amount') {
      finalPrice = this.price - discount.amount;
    }
  }

  this.finalPrice = finalPrice > 0 ? finalPrice : 0;

  next();
});

// Product Schema
const ProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: LocalizedStringSchema,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Fertilizers',
        'Growth Promoters',
        'Fungicides',
        'Pesticides',
        'Herbicides',
        'Nutrients',
        'Farm Machineries',
        'Others',
        'Gardening',
      ],
    },
    tags: {
      type: [String],
      required: false,
      trim: true,
    },
    description: {
      type: LocalizedStringSchema,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    // Add other product-level fields as needed

    // Embedded Variants Array
    variants: [VariantSchema], // Array of VariantSchema

    images: [
      {
        type: String,
        trim: true,
      },
    ],
    // Additional fields that are not variant-specific
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
    },
    dimensions: {
      length: { type: Number, min: [0, 'Length cannot be negative'] },
      width: { type: Number, min: [0, 'Width cannot be negative'] },
      height: { type: Number, min: [0, 'Height cannot be negative'] },
    },
    applicationMethod: {
      type: LocalizedStringSchema,
      trim: true,
    },
    usageInstructions: {
      type: LocalizedStringSchema,
      trim: true,
    },
    safetyInstructions: {
      type: LocalizedStringSchema,
      trim: true,
    },
    composition: {
      type: LocalizedStringSchema, 
      trim: true,
    },
    expirationDate: {
      type: Date,
    },
    certifications: [
      {
        type: String,
        trim: true,
      },
    ],
    power: {
      type: Number, 
      min: [0, 'Power cannot be negative'],
    },
    engineType: {
      type: String,
      trim: true,
    },
    fuelType: {
      type: String,
      trim: true,
    },
    features: [
      {
        type: LocalizedStringSchema, 
        trim: true,
      },
    ],
    warranty: {
      type: LocalizedStringSchema,
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Average rating cannot be negative'],
      max: [5, 'Average rating cannot exceed 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    reviews: [ReviewSchema],
    hazardous: { 
      type: Boolean,
      default: false,
    },
    fragile: { 
      type: Boolean,
      default: false,
    },
    itemType: { 
      type: String,
      enum: ['Chemical', 'Fertilizer', 'Tool', 'Gardening Equipment', 'Others'],
      required: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Virtual field for inventory items
ProductSchema.virtual('inventoryItems', {
  ref: 'InventoryItem',
  localField: '_id',
  foreignField: 'product',
});

// Ensure virtual fields are included when converting to JSON or Object
ProductSchema.set('toObject', { virtuals: true });
ProductSchema.set('toJSON', { virtuals: true });


// Pre-save middleware to calculate averageRating and reviewCount
ProductSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = totalRating / this.reviews.length;
    this.reviewCount = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.reviewCount = 0;
  }
  next();
});



// Example: Updated addVariant method without stockQuantity
ProductSchema.methods.addVariant = async function(variantData) {
  this.variants.push(variantData);
  return this.save();
};

// Example: Updated updateVariant method without stockQuantity
ProductSchema.methods.updateVariant = async function(variantId, updatedData) {
  const variant = this.variants.find(v => v.variantId === variantId);
  if (variant) {
    Object.assign(variant, updatedData);
    return this.save();
  }
  throw new Error('Variant not found');
};

// Example: Updated removeVariant method without stockQuantity
ProductSchema.methods.removeVariant = async function(variantId) {
  const variant = this.variants.find(v => v.variantId === variantId);
  if (variant) {
    this.variants = this.variants.filter(v => v.variantId !== variantId);
    return this.save();
  }
  throw new Error('Variant not found');
};



// Static Methods (Optional)

/**
 * Finds a product by SKU across all variants.
 * @param {String} sku - The SKU to search for.
 * @returns {Promise} - Resolves to the found product or null.
 */
ProductSchema.statics.findBySKU = function(sku) {
  return this.findOne({ 'variants.sku': sku, archived: { $ne: true } });
};


// Indexes for Optimization
ProductSchema.index({ 'variants.sku': 1 }, { unique: true }); 
ProductSchema.index({ productId: 1 }); 
ProductSchema.index({ archived: 1 });

module.exports = mongoose.model('Product', ProductSchema);
