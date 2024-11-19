// models/Ad.js

const mongoose = require('mongoose');

// Destructure Schema and Schema Types
const { Schema, model } = mongoose;

// Owner Subschema
const OwnerSchema = new Schema({
  name: {
    type: String,
    required: [false, 'Owner name is required'],
    trim: true,
    maxlength: [100, 'Owner name cannot exceed 100 characters'],
  },
  contactNumber: {
    type: String,
    required: [false, 'Owner contact number is required'],
    trim: true,
    match: [
      /^\+?[1-9]\d{1,14}$/,
      'Please enter a valid contact number (E.164 format)',
    ],
  },
  email: {
    type: String,
    required: [false, 'Owner email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
});

// Address Subschema
const AddressSchema = new Schema({
  street: {
    type: String,
    required: [false, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters'],
  },
  city: {
    type: String,
    required: [false, 'City is required'],
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters'],
  },
  state: {
    type: String,
    required: [false, 'State is required'],
    trim: true,
    maxlength: [100, 'State name cannot exceed 100 characters'],
  },
  country: {
    type: String,
    required: [false, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters'],
  },
  zipCode: {
    type: String,
    required: [false, 'Zip code is required'],
    trim: true,
  },
});


const AdSchema = new Schema(
  {
    title: {
      type: String,
      required: [false, 'Ad title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    postedAdId: {
      type: String,
      required: [true, 'Ad Id is required'],
      unique: true, // Ensure uniqueness
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    media: {
      images: [
        {
          type: String,
          required: false,
          trim: true,
        },
      ],
      videos: [
        {
          type: String,
          trim: true,
          match: [
            /\.(mp4|mov|avi)$/,
            'Please enter a valid video URL (mp4, mov, avi)',
          ],
        },
      ],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: [true, 'Location type is required'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required for Point type'],
        validate: {
          validator: function (value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message:
            'Coordinates must be an array of [longitude, latitude] within valid ranges',
        },
      },
    },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: [false, 'Boundary type is required'],
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]],
        required: [false, 'Boundary coordinates are required'],
        validate: {
          validator: function (value) {
            return (
              Array.isArray(value) &&
              value.length > 0 &&
              value.every(
                (ring) =>
                  Array.isArray(ring) &&
                  ring.length >= 4 &&
                  ring[0][0] === ring[ring.length - 1][0] &&
                  ring[0][1] === ring[ring.length - 1][1]
              )
            );
          },
          message:
            'Boundary coordinates must be an array of linear rings with at least four coordinates and the first coordinate equal to the last',
        },
      },
    },
    area: {
      type: Number,
      required: [false, 'Area is required'],
      min: [0, 'Area must be a positive number'],
    },
    areaUnit: {
      type: String,
      enum: ['acres', 'sq.ft', 'hectares', 'marla', 'cents', 'bigha', 'kottah'],
      required: [false, 'Area unit is required'],
    },
    price: {
      type: Number,
      required: [false, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    priceCurrency: {
      type: String,
      enum: ['USD', 'INR', 'EUR', 'GBP', 'Other'],
      default: 'USD',
    },
    nearbyLocalities: [
      {
        type: String,
        trim: true,
        maxlength: [100, 'Locality name cannot exceed 100 characters'],
      },
    ],
    owner: {
      type: OwnerSchema,
      required: [false, 'Owner details are required'],
    },
    address: {
      type: AddressSchema,
      required: [false, 'Address is required'],
    },
    type: {
      type: String,
      enum: ['House', 'Agriculture', 'Commercial', 'Industrial', 'Other'],
      required: [false, 'Property type is required'],
    },
    postedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending', 'Sold', 'Rented'],
      default: 'Active',
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

AdSchema.index({ location: '2dsphere' });

AdSchema.index({ postedAdId: 1 }, { unique: true });

module.exports = model('agricultureLandRental', AdSchema);
