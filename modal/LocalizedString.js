// models/LocalizedString.js

const mongoose = require('mongoose');

const LocalizedStringSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    te: { type: String, trim: true },
    kn: { type: String, trim: true },
    ta: { type: String, trim: true },
    ml: { type: String, trim: true },
    bn: { type: String, trim: true },
    hi: { type: String, trim: true },
  },
  { _id: false } // Prevents Mongoose from adding an _id field
);

module.exports = LocalizedStringSchema;
