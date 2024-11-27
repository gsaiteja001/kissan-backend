// config/mongoose.js
const mongoose = require('mongoose');

const connectMongoose = async () => {
  try {
    await mongoose.connect('mongodb://your-mongodb-uri', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectMongoose;
