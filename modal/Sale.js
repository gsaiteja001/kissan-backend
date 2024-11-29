// models/Sale.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema(
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
    quantitySold: {
      type: Number,
      required: true,
      min: [1, 'Quantity sold must be at least 1'],
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    // Additional fields like customer info can be added here
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', SaleSchema);
