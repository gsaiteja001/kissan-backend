const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

/**
 * CustomerServiceAgent Schema
 * This schema represents customer service agents who handle FarmersTickets.
 */
const CustomerServiceAgentSchema = new Schema({
  // Unique Agent ID
  serviceAgentId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    trim: true,
  },

  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Invalid email address'],
  },
  
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  
  profilePicture: {
    type: String, // URL to the profile picture
    required: false,
    trim: true,
  },
  
  // Language Proficiency
  languages: {
    type: [String],
    required: true,
    default: ['English'], // Default language
  },
  
  // Performance Metrics
  ratings: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  
  ticketsResolved: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  ticketsPending: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  complaints: [{
    type: Schema.Types.ObjectId,
    ref: 'Complaint', // Assuming a Complaint model exists
  }],
  
  // Associations
  assignedManager: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to a User or Manager model
    required: false,
  },
  
  assignedTickets: [{
    type: Schema.Types.ObjectId,
    ref: 'FarmersTicket',
  }],
  
  // Status Management
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
    required: true,
  },
  
  // Employment Details
  dateJoined: {
    type: Date,
    default: Date.now,
    required: true,
  },
  
  lastActive: {
    type: Date,
    default: Date.now,
    required: true,
  },
  
  shift: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Night', 'Flexible'],
    default: 'Flexible',
    required: false,
  },
  
  // Skills and Certifications
  skills: {
    type: [String],
    required: false,
    default: [],
  },
  
  certifications: [{
    type: String,
    required: false,
  }],
  
  // Availability Status
  isAvailable: {
    type: Boolean,
    default: true,
    required: true,
  },
  
  // Notifications Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  
  // Additional Information
  notes: {
    type: String,
    required: false,
    trim: true,
  },
  
}, { 
  timestamps: true, // Automatically manages createdAt and updatedAt
});

// Virtuals

/**
 * Virtual for the agent's full name.
 */
CustomerServiceAgentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual for calculating the overall status based on ticketsResolved and ticketsPending.
 */
CustomerServiceAgentSchema.virtual('overallPerformance').get(function () {
  if (this.ticketsResolved + this.ticketsPending === 0) return 'No Data';
  return (this.ticketsResolved / (this.ticketsResolved + this.ticketsPending)) * 100;
});

// Indexes for Optimization
CustomerServiceAgentSchema.index({ serviceAgentId: 1 });
CustomerServiceAgentSchema.index({ email: 1 });
CustomerServiceAgentSchema.index({ phoneNumber: 1 });
CustomerServiceAgentSchema.index({ status: 1 });
CustomerServiceAgentSchema.index({ assignedManager: 1 });
CustomerServiceAgentSchema.index({ 'ratings.averageRating': -1 });

// Pre-save Middleware to Update Last Active Date
CustomerServiceAgentSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Methods

/**
 * Method to update ratings.
 * @param {Number} newRating - The new rating to be added.
 */
CustomerServiceAgentSchema.methods.updateRatings = function(newRating) {
  this.ratings.averageRating = ((this.ratings.averageRating * this.ratings.totalRatings) + newRating) / (this.ratings.totalRatings + 1);
  this.ratings.totalRatings += 1;
  return this.save();
};

/**
 * Method to assign a ticket to the agent.
 * @param {ObjectId} ticketId - The ID of the FarmersTicket to assign.
 */
CustomerServiceAgentSchema.methods.assignTicket = function(ticketId) {
  this.assignedTickets.push(ticketId);
  this.ticketsPending += 1;
  return this.save();
};

/**
 * Method to mark a ticket as resolved.
 * @param {ObjectId} ticketId - The ID of the FarmersTicket to resolve.
 */
CustomerServiceAgentSchema.methods.resolveTicket = function(ticketId) {
  const ticketIndex = this.assignedTickets.indexOf(ticketId);
  if (ticketIndex > -1) {
    this.assignedTickets.splice(ticketIndex, 1);
    this.ticketsResolved += 1;
    this.ticketsPending = Math.max(this.ticketsPending - 1, 0);
  }
  return this.save();
};

// Export the CustomerServiceAgent model
module.exports = mongoose.model('CustomerServiceAgent', CustomerServiceAgentSchema);
