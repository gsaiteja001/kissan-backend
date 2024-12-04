// models/StockTransaction.js

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the types of transactions
const TRANSACTION_TYPES = ['stockIn', 'stockOut', 'adjust', 'moveStock'];

// Define the types of related transactions
const RELATED_TRANSACTION_TYPES = ['StockTransaction', 'Purchase', 'SalesTransaction'];

// Subschema for individual product transactions within a StockTransaction
const productTransactionSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    default: 'kg', // Ensure consistency with InventoryItem
    enum: ['kg', 'liters', 'units', 'packs', 'boxes', 'others'], // Add more units as needed
  },
}, { _id: false });

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      default: uuidv4, // Automatically generate UUIDv4
      unique: true,
      immutable: true,
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
    products: [productTransactionSchema], // Array of products involved in the transaction
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
      type: String, // Can be a reference to a User model if you have authentication
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

// Export the StockTransaction model
module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
