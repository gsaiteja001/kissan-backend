const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

/**
 * FarmersTicket Schema
 * This schema is used for tracking issues or concerns raised by farmers 
 * (regarding orders, products, or service requests).
 */

const NoteSchema = new Schema({
  noteText: { type: String, trim: true },
  createdBy: { type: String, ref: 'User', required: false }, // or 'Admin' if you have a separate admin model
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const AttachmentSchema = new Schema({
  fileName: { type: String, required: false },
  fileUrl: { type: String, required: false },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const FarmersTicketSchema = new Schema({
  // Unique Ticket ID
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,  // or () => uuidv4()
    trim: true,
  },

  farmerId: {
    type: String,
    required: true,
  },

  // Category of the issue:
  //   - "Order" if related to an order
  //   - "ServiceRequest" if related to a service request
  //   - "Other" if it doesn't fall under the above categories
  category: {
    type: String,
    enum: ['Order', 'ServiceRequest', 'Other'],
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
    agentId: { type: String, required: false, ref: 'User' }, // or 'Admin'
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

module.exports = mongoose.model('FarmersTicket', FarmersTicketSchema);
