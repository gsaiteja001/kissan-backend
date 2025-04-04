const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

/* ---------------------------------------------------
   Agent Subschemas
--------------------------------------------------- */

// Performance details for the Agent
const AgentPerformanceSchema = new Schema({
  ticketsOpened: { type: Number, default: 0 },
  ticketsResolved: { type: Number, default: 0 },
  ticketsUnresolved: { type: Number, default: 0 },
  ticketsTransferred: { type: Number, default: 0 },
  timeSpentOnTickets: { type: Number, default: 0 }, // in minutes
  averageResponseTime: { type: Number, default: 0 }, // in minutes
  reviews: [
    {
      reviewer: { type: String, required: false },
      rating: { type: Number, min: 1, max: 5, required: false },
      comment: { type: String, trim: true },
      date: { type: Date, default: Date.now },
    },
  ],
}, { _id: false });

// Group information for the Agent
const GroupSchema = new Schema({
  groupId: { type: String, required: false },
  groupName: { type: String, required: false },
  permissions: {
    type: [String],
    enum: ['manage-tickets', 'view-tickets', 'assign-tickets', 'resolve-tickets', 'transfer-tickets', 'admin'],
    required: false,
  },
}, { _id: false });

/* ---------------------------------------------------
   Agent Schema as a Subdocument
--------------------------------------------------- */
const AgentSchema = new Schema({
  agentId: { type: String, default: uuidv4, immutable: true },
  userId: { type: String, required: false },
  fullName: { type: String, required: false, trim: true },
  email: { type: String, required: false, unique: true },
  phoneNumber: { type: String, required: false },
  role: { type: String, required: false, enum: ['Agent', 'Admin', 'TeamLeader'], default: 'Agent' },
  profilePicture: { type: String, required: false },
  performance: { type: AgentPerformanceSchema, default: {} },
  group: [{ type: GroupSchema, required: true }],
  assignedTickets: [{ type: String, ref: 'FarmersTicket' }],
  ticketsHistory: [{ type: String, ref: 'FarmersTicket' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  _id: false // embed without creating a separate ObjectId for the subdocument
});

/* ---------------------------------------------------
   Updated User Schema with Integrated Agent Schema
--------------------------------------------------- */
const userSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  credentials: {
    username: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    }
  },
  name: { type: String, required: true },
  lastloginTime: { type: Date, default: Date.now },
  email: {
    type: String,
    required: false,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  },
  phoneNumber: {
    type: String,
    required: false,
    match: /^[0-9]{10}$/
  },
  address: { type: String, required: false },
  userRoles: {
    type: [String],
    enum: [
      'superAdmin',
      'serviceAdmin',
      'ProductAdmin',
      'Vendor',
      'supportAdmin',
      'supportAgent',
      'financialAdmin',
      'groupsAdmin',
      'groupLeader'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active',
  },
  // Embed agent details if the user is a support role.
  agent: {
    type: AgentSchema,
    required: function() {
      // Only require agent info if userRoles include 'supportAdmin' or 'supportAgent'
      return this.userRoles.includes('supportAdmin') || this.userRoles.includes('supportAgent');
    }
  }
});

/* ---------------------------------------------------
   Export the User Model
--------------------------------------------------- */
const User = mongoose.model('User', userSchema);
module.exports = User;
