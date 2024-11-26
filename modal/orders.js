const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschema for Address (if not already defined)
const AddressSchema = new Schema({
  street: { type: String, required: false },
  area: { type: String, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  postalCode: { type: String, required: false },
  country: { type: String, required: false },
});

// Subschema for Order Items
const OrderItemSchema = new Schema({
  productId: { type: String, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  sizeOption: {
    size: { type: String, required: true },
    price: { type: Number, required: true },
  },
  quantity: { type: Number, required: true, default: 1 },
  weight: { type: Number, required: true }, // Weight per item
  totalItemWeight: { type: Number, required: true }, // weight * quantity
  hazardous: { type: Boolean, required: true, default: false }, // Indicates if the item is hazardous
  fragile: { type: Boolean, required: true, default: false }, // Indicates if the item is fragile
  itemType: { type: String, required: true }, // e.g., 'Chemical', 'Fertilizer', 'Tool', etc.
});

// Subschema for Payment Details
const PaymentDetailsSchema = new Schema({
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Cash on Delivery'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending',
    required: true,
  },
  transactionId: { type: String, required: false },
  amountPaid: { type: Number, required: true },
});

// Subschema for Shipping Details
const ShippingDetailsSchema = new Schema({
  address: AddressSchema,
  distance: { type: Number, required: true }, // Distance in kilometers
  estimatedDeliveryDate: { type: Date, required: false },
  shippingMethod: {
    type: String,
    enum: ['Standard', 'Express', 'Overnight'],
    default: 'Standard',
    required: true,
  },
  trackingNumber: { type: String, required: false },
  carrier: { type: String, required: false }, // e.g., 'DHL', 'FedEx', etc.
});

// Subschema for Order Status History
const OrderStatusHistorySchema = new Schema({
  status: {
    type: String,
    enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
    required: true,
  },
  date: { type: Date, default: Date.now, required: true },
  remarks: { type: String, required: false },
});

// Main Order Schema
const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true },
    farmerId: { type: String, required: true, ref: 'Farmer' },
    orderItems: { type: [OrderItemSchema], required: true },
    totalQuantity: { type: Number, required: true },
    totalWeight: { type: Number, required: true }, // Sum of all item weights
    totalPrice: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
      default: 'Placed',
      required: true,
    },
    statusHistory: { type: [OrderStatusHistorySchema], required: true, default: [] },
    paymentDetails: { type: PaymentDetailsSchema, required: true },
    shippingDetails: { type: ShippingDetailsSchema, required: true },
    orderDate: { type: Date, default: Date.now, required: true },
    shippedDate: { type: Date, required: false },
    deliveredDate: { type: Date, required: false },
    cancelledDate: { type: Date, required: false },
    returnedDate: { type: Date, required: false },
    reasonForCancellation: { type: String, required: false },
    reasonForReturn: { type: String, required: false },
    customerRemarks: { type: String, required: false },
    adminRemarks: { type: String, required: false },
  },
  { timestamps: true }
);

// Pre-save middleware to calculate totalQuantity, totalWeight, and totalPrice
OrderSchema.pre('save', function (next) {
  let totalQuantity = 0;
  let totalWeight = 0;
  let totalPrice = 0;

  this.orderItems.forEach((item) => {
    totalQuantity += item.quantity;
    totalWeight += item.totalItemWeight; // weight * quantity
    totalPrice += item.sizeOption.price * item.quantity;
  });

  this.totalQuantity = totalQuantity;
  this.totalWeight = totalWeight;
  this.totalPrice = totalPrice;

  next();
});

module.exports = mongoose.model('Order', OrderSchema);
