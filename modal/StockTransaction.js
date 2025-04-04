const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the types of transactions
const TRANSACTION_TYPES = ['stockIn', 'stockOut', 'adjust', 'moveStock'];

// Include 'SalesTransaction' here to allow referencing SalesTransaction in relatedTransaction
const RELATED_TRANSACTION_TYPES = ['StockTransaction', 'SalesTransaction'];

const productTransactionSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    trim: true,
  },
  variantId: {
    type: String,
    required: false,
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    default: 'kg',
    enum: ['kg', 'liters', 'units', 'packs', 'boxes', 'others'],
  },
  unitPrice: { type: Number, required: false },
}, { _id: false });

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      default: uuidv4,
      unique: true,
      immutable: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: [true, 'Transaction type is required'],
    },
    warehouseId: { 
      type: String,
      required: [true, 'Warehouse ID is required'],
      trim: true,
    },
    products: [productTransactionSchema],
    relatedTransactionType: {
      type: String,
      enum: RELATED_TRANSACTION_TYPES,
      required: false,
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTransactionType',
      required: false,
    },
    performedBy: {
      type: String,
      required: false,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      required: false,
    },
    timestamp: { 
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
stockTransactionSchema.index({ warehouseId: 1, transactionType: 1, timestamp: -1 });
stockTransactionSchema.index({ 'products.productId': 1 });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
