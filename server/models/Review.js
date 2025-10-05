import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'javascript'
  },
  review: {
    type: String,
    required: true
  },
  issues: [{
    type: String,
    severity: String,
    line: Number
  }],
  score: {
    type: Number,
    min: 0,
    max: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Review', reviewSchema);