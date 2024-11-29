// models/InventoryItem.js
const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create a unique index to prevent duplicate entries for the same product in the same warehouse
InventoryItemSchema.index({ warehouse: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
