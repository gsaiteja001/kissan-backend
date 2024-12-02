const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      required: false,
    },
    productId: {
      type: String,
      required: false,
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



module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
