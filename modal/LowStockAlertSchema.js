const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const LowStockAlertSchema = new mongoose.Schema({
  alertId: { type: String, default: uuidv4, unique: true, immutable: true },
  warehouseId: { type: String, required: true, ref: 'Warehouse' },
  productId: { type: String, required: true, ref: 'Product' },
  variantId: { type: String, required: false, ref: 'Variant' },
  currentStock: { type: Number, required: true, min: [0, 'Stock cannot be negative'] },
  reorderLevel: { type: Number, required: true, min: [0, 'Reorder level cannot be negative'] },
  alertDate: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('LowStockAlert', LowStockAlertSchema);
