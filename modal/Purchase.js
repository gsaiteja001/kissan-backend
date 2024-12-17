const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Sub-schema for purchased products
const PurchasedProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  quantity: { type: Number, required: true, min: [0, 'Quantity cannot be negative'] },
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] },
  taxes: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalCost: { type: Number, required: true, min: [0, 'Total cost cannot be negative'] },
}, { _id: false });

// Sub-schema for each warehouse fulfillment
const FulfillmentSchema = new mongoose.Schema({
  warehouseId: { type: String, required: true }, // Removed ref: 'Warehouse'
  products: [PurchasedProductSchema],
  totalQuantity: { type: Number, required: true, min: [0, 'Total quantity cannot be negative'] },
  subTotal: { type: Number, required: true, min: [0, 'Sub-total cannot be negative'] },
  totalTax: { type: Number, default: 0 },
  totalTransportCharges: { type: Number, default: 0 },
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
      enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Others'],
      required: true, // Ensure it's required
    },
    transactionId: { type: String },
    amountPaid: { type: Number, min: [0, 'Amount paid cannot be negative'] },
  },
  deliveryStatus: { 
    type: String,
    enum: ['Pending', 'In Transit', 'Delivered', 'Partial', 'Failed'],
    default: 'Pending',
  },
  stockTransaction: { // Reference to StockTransaction
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    required: false,
  },
  notes: { type: String },
}, { _id: false });


const PurchaseSchema = new mongoose.Schema({
  purchaseId: { type: String, default: uuidv4, unique: true, immutable: true },
  supplierId: { type: String, required: true, ref: 'Supplier' },
  // warehouseId: { type: String, required: true, ref: 'Warehouse' },
  purchaseDate: { type: Date, default: Date.now },
  // New field to handle multiple warehouse fulfillments
  fulfillments: [FulfillmentSchema],
  // Overall totals
  totalQuantity: { type: Number, required: true, min: [0, 'Total quantity cannot be negative'] },
  subTotal: { type: Number, required: true, min: [0, 'Sub-total cannot be negative'] },
  totalTax: { type: Number, default: 0 },
  totalTransportCharges: { type: Number, default: 0 },
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
      enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Others'],
    },
    transactionId: { type: String },
    amountPaid: { type: Number, min: [0, 'Amount paid cannot be negative'] },
  },
  notes: { type: String },
  // Removed single stockTransaction reference
  // stockTransaction: { 
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'StockTransaction',
  //   required: false,
  // },
}, { timestamps: true });


// Virtual field to populate Warehouse based on warehouseId
FulfillmentSchema.virtual('warehouse', {
  ref: 'Warehouse',
  localField: 'warehouseId',
  foreignField: 'warehouseId', // Ensure 'warehouseId' exists in Warehouse schema
  justOne: true,
});

// Ensure virtuals are included when converting to JSON or Object
FulfillmentSchema.set('toObject', { virtuals: true });
FulfillmentSchema.set('toJSON', { virtuals: true });


// Pre-validate middleware to calculate totals based on fulfillments
PurchaseSchema.pre('validate', function(next) {
  let totalQuantity = 0;
  let subTotal = 0;
  let totalTax = 0;
  let totalTransportCharges = 0;
  let totalOtherCharges = 0;
  let grandTotal = 0;

  // Reset fulfillments' totals before recalculating
  this.fulfillments.forEach(fulfillment => {
    let fulfillmentQuantity = 0;
    let fulfillmentSubTotal = 0;
    let fulfillmentTax = 0;
    let fulfillmentTransport = 0;
    let fulfillmentOther = 0;

    fulfillment.products.forEach(product => {
      fulfillmentQuantity += product.quantity;
      fulfillmentSubTotal += product.totalPrice;
      fulfillmentTax += product.taxes || 0;
      fulfillmentTransport += product.transportCharges || 0;
      fulfillmentOther += product.otherCharges || 0;

      // Calculate totalCost if not provided
      if (!product.totalCost || product.totalCost <= 0) {
        product.totalCost = product.totalPrice + 
                             (product.taxes || 0) + 
                             (product.transportCharges || 0) + 
                             (product.otherCharges || 0);
      }
    });

    fulfillment.totalQuantity = fulfillmentQuantity;
    fulfillment.subTotal = fulfillmentSubTotal;
    fulfillment.totalTax = fulfillmentTax;
    fulfillment.totalTransportCharges = fulfillmentTransport;
    fulfillment.totalOtherCharges = fulfillmentOther;
    fulfillment.grandTotal = fulfillmentSubTotal + fulfillmentTax + fulfillmentTransport + fulfillmentOther;

    // Accumulate overall totals
    totalQuantity += fulfillmentQuantity;
    subTotal += fulfillmentSubTotal;
    totalTax += fulfillmentTax;
    totalTransportCharges += fulfillmentTransport;
    totalOtherCharges += fulfillmentOther;
    grandTotal += fulfillment.grandTotal;
  });

  this.totalQuantity = totalQuantity;
  this.subTotal = subTotal;
  this.totalTax = totalTax;
  this.totalTransportCharges = totalTransportCharges;
  this.totalOtherCharges = totalOtherCharges;
  this.grandTotal = grandTotal;

  next();
});


module.exports = mongoose.model('Purchase', PurchaseSchema);
