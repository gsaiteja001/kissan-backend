const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      required: [true, 'Warehouse ID is required'],
    },
    productId: {
      type: String,
      required: [true, 'Product ID is required'],
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

// Create a compound unique index to prevent duplicate entries for the same product in the same warehouse
InventoryItemSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
