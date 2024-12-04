const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Sub-schema for sold products
const SoldProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  quantity: { type: Number, required: true, min: [0, 'Quantity cannot be negative'] },
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] },
  taxes: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalCost: { type: Number, required: true, min: [0, 'Total cost cannot be negative'] },
}, { _id: false });

const SalesTransactionSchema = new mongoose.Schema({
  salesTransactionId: { type: String, default: uuidv4, unique: true, immutable: true },
  orderId: { type: String, required: true, ref: 'Order' },
  warehouseId: { type: String, required: true, ref: 'Warehouse' },
  saleDate: { type: Date, default: Date.now },
  products: [SoldProductSchema],
  totalQuantity: { type: Number, required: true, min: [0, 'Total quantity cannot be negative'] },
  subTotal: { type: Number, required: true, min: [0, 'Sub-total cannot be negative'] },
  totalTax: { type: Number, default: 0 },
  totalOtherCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, min: [0, 'Grand total cannot be negative'] },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'], 
    default: 'Pending' 
  },
  paymentDetails: {
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Cash on Delivery'],
    },
    transactionId: { type: String },
    amountPaid: { type: Number, min: [0, 'Amount paid cannot be negative'] },
  },
  notes: { type: String },
  stockTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    required: false,
  },
}, { timestamps: true });

// Pre-save middleware to calculate totals
SalesTransactionSchema.pre('save', function(next) {
  let totalQuantity = 0;
  let subTotal = 0;
  let totalTax = 0;
  let totalOtherCharges = 0;

  this.products.forEach(product => {
    totalQuantity += product.quantity;
    subTotal += product.totalPrice;
    totalTax += product.taxes || 0;
    totalOtherCharges += product.otherCharges || 0;

    // Calculate totalCost if not provided
    if (!product.totalCost || product.totalCost <= 0) {
      product.totalCost = product.totalPrice + (product.taxes || 0) + (product.otherCharges || 0);
    }
  });

  this.totalQuantity = totalQuantity;
  this.subTotal = subTotal;
  this.totalTax = totalTax;
  this.totalOtherCharges = totalOtherCharges;
  this.grandTotal = subTotal + totalTax + totalOtherCharges;

  next();
});

module.exports = mongoose.model('SalesTransaction', SalesTransactionSchema);
