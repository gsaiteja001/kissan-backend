const mongoose = require('mongoose');

const LocalizedStringSchema = new mongoose.Schema(
  {
    en: { type: String, required: false, trim: true },
    te: { type: String, trim: true },
    kn: { type: String, trim: true },
    ta: { type: String, trim: true },
    ml: { type: String, trim: true },
    bn: { type: String, trim: true },
    hi: { type: String, trim: true },
    ma: { type: String, trim: true },
    gu: { type: String, trim: true },
    od: { type: String, trim: true },
    pj: { type: String, trim: true },
    as: { type: String, trim: true },
  },
  { _id: false } 
);

module.exports = LocalizedStringSchema;