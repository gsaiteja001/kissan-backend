// models/Supplier.js
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactInfo: {
    phone: { type: String },
    email: { type: String },
    address: { type: addressSchema },
  },
  productsSupplied: [{ type: String }], // List of product SKUs
  // ... other fields
});

module.exports = mongoose.model('Supplier', supplierSchema);
