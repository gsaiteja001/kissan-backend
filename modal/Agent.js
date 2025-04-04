const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Subschema for Agent's Credentials
const AgentCredentialsSchema = new Schema({
  username: { type: String, required: false, unique: true },
  passwordHash: { type: String, required: false }, // store hashed passwords
  authenticationMethod: {
    type: String,
    enum: ['email/password', 'oauth'],
    default: 'email/password',
  },
  lastLogin: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active',
  },
}, { _id: false });

// Subschema for Agent's Performance on Tickets
const AgentPerformanceSchema = new Schema({
  ticketsOpened: { type: Number, default: 0 },
  ticketsResolved: { type: Number, default: 0 },
  ticketsUnresolved: { type: Number, default: 0 },
  ticketsTransferred: { type: Number, default: 0 },
  timeSpentOnTickets: { type: Number, default: 0 }, // in minutes
  averageResponseTime: { type: Number, default: 0 }, // in minutes
  reviews: [
    {
      reviewer: { type: String, required: false }, // Name of the reviewer (could be a farmer)
      rating: { type: Number, min: 1, max: 5, required: false }, // Rating out of 5
      comment: { type: String, trim: true },
      date: { type: Date, default: Date.now },
    },
  ],
}, { _id: false });

// Subschema for Group Information
const GroupSchema = new Schema({
  groupId: { type: String, required: false },
  groupName: { type: String, required: false },
  permissions: {
    type: [String],
    enum: ['manage-tickets', 'view-tickets', 'assign-tickets', 'resolve-tickets', 'transfer-tickets', 'admin'],
    required: false,
  },
}, { _id: false });

// Main Agent Schema
const AgentSchema = new Schema(
  {
    agentId: { type: String, default: uuidv4, immutable: true },
    userId: {
        type: String,
        required: false,
      },
    fullName: { type: String, required: false, trim: true },
    email: { type: String, required: false, unique: true },
    phoneNumber: { type: String, required: false },
    role: { type: String, required: false, enum: ['Agent', 'Admin','TeamLeader'], default: 'Agent' },
    profilePicture: { type: String, required: false },
    credentials: { type: AgentCredentialsSchema, required: false },
    performance: { type: AgentPerformanceSchema, default: {} },
    group: [{ type: GroupSchema, required: true }],
    assignedTickets: [{ type: String, ref: 'FarmersTicket' }], // Tickets assigned to the agent
    ticketsHistory: [{ type: String, ref: 'FarmersTicket' }], // All tickets this agent has worked on
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Pre-save middleware to update agent's performance metrics
AgentSchema.pre('save', function (next) {
  if (this.isModified('performance')) {
    // Recalculate performance metrics if needed (e.g., time spent, average response time, etc.)
    this.performance.averageResponseTime = this.performance.ticketsOpened > 0
      ? this.performance.timeSpentOnTickets / this.performance.ticketsOpened
      : 0;
  }
  next();
});

// Export the Agent model
module.exports = mongoose.model('Agent', AgentSchema);
