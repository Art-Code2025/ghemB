import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  userId: { type: String, default: 'guest' }, // guest أو customer id
  productId: { type: Number, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  image: { type: String, default: '' },
  selectedOptions: { type: Object, default: {} }, // المواصفات المختارة مثل المقاس واللون
  optionsPricing: { type: Object, default: {} }, // أسعار الإضافات للخيارات
  attachments: { 
    type: Object, 
    default: {} 
  }, // المرفقات: { images: [], text: '' }
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment ID
cartSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastItem = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastItem ? lastItem.id + 1 : 1;
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart; 