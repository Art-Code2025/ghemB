import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  userId: { type: String, default: 'guest' }, // guest أو customer id
  productId: { type: Number, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment ID
wishlistSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastItem = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastItem ? lastItem.id + 1 : 1;
  }
  next();
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist; 