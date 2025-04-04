const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

/**
 * FarmersTicket Schema
 * This schema is used for tracking issues or concerns raised by farmers 
 * (regarding orders, products, or service requests).
 */

// Subschema for Notes on tickets
const NoteSchema = new Schema({
  noteText: { type: String, trim: true },
  createdBy: { type: String, ref: 'User', required: false }, // or 'Admin' if you have a separate admin model
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Subschema for file attachments related to tickets
const AttachmentSchema = new Schema({
  fileName: { type: String, required: false },
  fileUrl: { type: String, required: false },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

// FarmersTicket Schema
const FarmersTicketSchema = new Schema({
  // Unique Ticket ID
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    trim: true,
  },

  farmerId: {
    type: String,
    required: true,
  },

  // Category of the issue:
  category: {
    type: String,
    enum: [
      'Order-Related', 
      'Profile-Related', 
      'Product-Related', 
      'Disease-Related', 
      'Service-Related', 
      'Shipping-Related', 
      'Payment-Related', 
      'Promotion-Related', 
      'Technical-Issues', 
      'Feedback', 
      'Legal-Compliance', 
      'Out-of-Stock-Pre-order'
    ],
    required: true,
  },

  // Subcategory for each category (to track more specific types of issues)
  subcategory: {
    type: String,
    enum: [
      // Order-Related Subcategories
      'Refund Request', 'Return Request', 'Order Cancellation', 
      'Order Status Inquiry', 'Order Modification',

      // Profile-Related Subcategories
      'Profile Information Update', 'Password Reset', 
      'Account Deactivation/Deletion', 'Account Verification', 'Loyalty/Reward Program Inquiry',

      // Product-Related Subcategories
      'Product Availability Inquiry', 'Product Information Request', 'Product Recommendations',

      // Disease-Related Subcategories
      'Pest/Disease Identification', 'Disease/Plant Care Advice', 'Soil/Plant Condition',

      // Service-Related Subcategories
      'Export/Import Services', 'Bulk Orders', 'Agricultural Services', 'Consultation or Expert Advice',

      // Shipping-Related Subcategories
      'Delayed Delivery', 'Damaged Goods During Shipping', 'Wrong Shipping Information', 'Shipping Cost Inquiry',

      // Payment-Related Subcategories
      'Payment Failure/Issues', 'Billing Address Issues', 'Invoice Request', 'Refund Issues',

      // Promotion-Related Subcategories
      'Coupon Code Issues', 'Promotions and Offers Inquiry',

      // Technical Issues Subcategories
      'Website Navigation Issues', 'Payment Gateway Issues', 'Mobile App Issues', 'Feature Requests',

      // Feedback Subcategories
      'General Feedback', 'Feature Requests',

      // Legal/Compliance Subcategories
      'Privacy and Data Protection', 'Product Safety Compliance', 'Warranty Claims',

      // Out-of-Stock and Pre-order Subcategories
      'Out of Stock Product Inquiry', 'Pre-order Request'
    ],
    required: true,
  },

  // If the ticket is about an order, we store a reference to that order
  associatedOrderId: {
    type: String,
    required: false,
  },

  // If the ticket is about a service request, we store a reference to that
  associatedServiceRequestId: {
    type: String,
    required: false,
  },

  // Region could be automatically derived from farmer's location or specified
  region: {
    type: String,
    required: false,
    trim: true,
  },

  // A short or detailed description of the issue
  issueDescription: {
    type: String,
    required: true,
    trim: true,
  },

  // Optional feedback from the farmer (e.g., suggestions, complaints, etc.)
  feedback: {
    type: String,
    required: false,
    trim: true,
  },

  // Agent (human or system) who is assigned to handle the ticket
  assignedAgent: {
    agentId: { type: String, required: false}, // or 'Admin'
    agentName: { type: String, required: false, trim: true },
  },

  // Status of the ticket
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open',
    required: true,
  },

  // Priority of the ticket
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Low',
    required: false,
  },

  // Additional internal notes (e.g., from agent/admin) regarding the ticket
  notes: {
    type: [NoteSchema],
    required: false,
    default: [],
  },

  // Optional file attachments (e.g., screenshots, documents)
  attachments: {
    type: [AttachmentSchema],
    required: false,
    default: [],
  },

}, { 
  timestamps: true // Automatically handles createdAt, updatedAt
});

// Export the model
module.exports = mongoose.model('FarmersTicket', FarmersTicketSchema);
