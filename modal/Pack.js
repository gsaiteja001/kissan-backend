const mongoose = require('mongoose');


const PackSchema = new mongoose.Schema(
  {
    packId: {
        type: String,
        unique: true,
        required: true,
        trim: true,
      },
    warehouseId: {
      type: String,
      required: [false, 'Warehouse ID is required'],
    },
    // Array of Product IDs
    productIds: [
      {
        type: String,
        required: false,
        trim: true,
      },
    ],
    // Array of Variant IDs
    variantIds: [
      {
        type: String,
        required: false,
        trim: true,
      },
    ],
    unitPrice: {
      type: Number,
      required: [false, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    finalPrice: {
      type: Number,
      required: [true, 'Final price is required'],
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
    totalUnitPrice: {
      type: Number,
      required: [false, 'Total unit price is required'],
      min: [0, 'Total unit price cannot be negative'],
    },
    totalFinalPrice: {
      type: Number,
      required: [false, 'Total final price is required'],
      min: [0, 'Total final price cannot be negative'],
    },
    discountEndDate: {
      type: Date,
      required: false,
    },
    image: {
      type: String,
      trim: true,
      required: false,
    },
    packType: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);


PackSchema.index({ warehouseId: 1, productIds: 1, variantIds: 1 }, { unique: true });

module.exports = mongoose.model('Pack', PackSchema);
