import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  productId: { type: Number, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment ID
reviewSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastReview = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastReview ? lastReview.id + 1 : 1;
  }
  next();
});

const Review = mongoose.model('Review', reviewSchema);

export default Review; 