import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number },
  selectedOptions: { type: Object, default: {} },
  optionsPricing: { type: Object, default: {} },
  productImage: { type: String, default: '' },
  attachments: { 
    type: Object, 
    default: {} 
  } // المرفقات: { images: [], text: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  
  // معلومات العميل
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  
  // معلومات التوصيل
  address: { type: String, required: true },
  city: { type: String, required: true },
  
  // تفاصيل الطلب
  items: [orderItemSchema],
  subtotal: { type: Number },
  deliveryFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number },
  
  // معلومات الكوبون
  couponCode: { type: String, default: '' },
  couponDiscount: { type: Number, default: 0 },
  
  // حالة الطلب
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  
  // طريقة الدفع
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'cod', 'card', 'bank', 'bank_transfer', 'wallet'], 
    default: 'cod' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  },
  paymentId: { 
    type: String, 
    default: '' 
  },
  
  // ملاحظات
  notes: { type: String, default: '' },
  
  // تتبع الوقت
  orderDate: { type: Date, default: Date.now },
  expectedDelivery: { type: Date },
  deliveredAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-increment ID
orderSchema.pre('save', async function(next) {
  // حساب الـ ID التلقائي فقط لو مش موجود
  if (this.isNew && !this.id) {
    const lastOrder = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastOrder ? lastOrder.id + 1 : 1;
  }
  
  // حساب إجمالي كل عنصر
  this.items.forEach(item => {
    if (!item.totalPrice) {
      item.totalPrice = item.price * item.quantity;
    }
  });
  
  // حساب الإجمالي الفرعي إذا لم يكن محدد
  if (!this.subtotal) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  
  // حساب الإجمالي النهائي إذا لم يكن محدد
  if (!this.total) {
    this.total = this.subtotal + (this.deliveryFee || 0) - (this.discount || 0) - (this.couponDiscount || 0);
  }
  
  this.updatedAt = new Date();
  next();
});

// Methods لتغيير حالة الطلب
orderSchema.methods.confirm = function() {
  this.status = 'confirmed';
  return this.save();
};

orderSchema.methods.ship = function() {
  this.status = 'shipped';
  return this.save();
};

orderSchema.methods.deliver = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

orderSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Virtual للحصول على حالة الطلب بالعربية
orderSchema.virtual('statusInArabic').get(function() {
  const statusMap = {
    'pending': 'في الانتظار',
    'confirmed': 'مؤكد',
    'preparing': 'قيد التحضير',
    'shipped': 'تم الشحن',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي'
  };
  return statusMap[this.status] || this.status;
});

// Indexes للبحث السريع
orderSchema.index({ id: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderDate: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order; 