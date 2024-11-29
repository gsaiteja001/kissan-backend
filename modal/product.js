const mongoose = require('mongoose');

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

// Helper function to create multilingual fields
const createLocalizedField = () => ({
  en: { type: String, required: true, trim: true },
  te: { type: String, trim: true },
  kn: { type: String, trim: true },
  ta: { type: String, trim: true },
  ml: { type: String, trim: true },
});

const ProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: createLocalizedField(),
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
    },
    description: {
      type: createLocalizedField(),
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    finalPrice: {
      type: Number,
      min: [0, 'Final price cannot be negative'],
    },
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
    manufacturer: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
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
    applicationMethod: {
      type: createLocalizedField(),
      trim: true,
    },
    usageInstructions: {
      type: createLocalizedField(),
      trim: true,
    },
    safetyInstructions: {
      type: createLocalizedField(),
      trim: true,
    },
    composition: {
      type: createLocalizedField(),
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
      type: Number, // in horsepower
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
        type: createLocalizedField(),
        trim: true,
      },
    ],
    warranty: {
      type: createLocalizedField(),
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

    // Add virtual field for inventory items
    ProductSchema.virtual('inventoryItems', {
      ref: 'InventoryItem',
      localField: '_id',
      foreignField: 'product',
    });
    
    ProductSchema.set('toObject', { virtuals: true });
    ProductSchema.set('toJSON', { virtuals: true });

  },
  { timestamps: true }
);


// Middleware to update total stock quantity in Product
ProductSchema.methods.updateTotalStock = async function () {
  const totalStock = await InventoryItem.aggregate([
    { $match: { product: this._id } },
    { $group: { _id: null, totalStock: { $sum: '$stockQuantity' } } },
  ]);

  this.stockQuantity = totalStock.length > 0 ? totalStock[0].totalStock : 0;
  await this.save();
};

// Pre-save middleware to calculate finalPrice
ProductSchema.pre('save', function (next) {
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

module.exports = mongoose.model('Product', ProductSchema);
