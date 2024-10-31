const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentSchema = new Schema({
  commenterName: {
    type: String,
    required: false,
  },
  commenterId: {
    type: String,
    required: false,
  },
  commentText: {
    type: String,
    required: false,
  },
  commentedAt: {
    type: Date,
    default: Date.now,
  },
});


const PostSchema = new Schema(
  {
    postId: {   
        type: String,
        required: false,
    },
    creatorName: {
      type: String,
      required: false,
      trim: true,
    },
    farmerId: {
      type: String,
      required: false,
    },
    postDate: {
      type: Date,
      default: Date.now,
    },
    views: [
      {
        type: String,
        required: false,
      },
    ],
    imageUrls: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/.test(v);
          },
          message: props => `${props.value} is not a valid image URL!`,
        },
      },
    ],
    description: {
      type: String,
      required: false,
      trim: true,
    },
    likes: [
      {
        type: String, 
        required: false,
      },
    ],
    comments: [CommentSchema],
    category: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    subCategory: { 
      type: String,
      required: false,
      trim: true,
    },
    additionalDetails: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model('Post', PostSchema);
