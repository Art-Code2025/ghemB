import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true 
  },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, min: 0 }, // للنسبة المئوية
  minimumAmount: { type: Number, min: 0, default: 0 }, // الحد الأدنى للطلب
  usageLimit: { type: Number, min: 1 }, // عدد مرات الاستخدام
  usedCount: { type: Number, default: 0 }, // عدد مرات الاستخدام الفعلي
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-increment ID
couponSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastCoupon = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastCoupon ? lastCoupon.id + 1 : 1;
  }
  this.updatedAt = new Date();
  next();
});

// التحقق من صحة الكوبون قبل الاستخدام
couponSchema.methods.isValid = function(orderAmount) {
  // التحقق من التفعيل
  if (!this.isActive) {
    return { valid: false, message: 'الكوبون غير نشط' };
  }

  // التحقق من تاريخ الانتهاء
  if (this.expiryDate && new Date() > this.expiryDate) {
    return { valid: false, message: 'انتهت صلاحية الكوبون' };
  }

  // التحقق من عدد مرات الاستخدام
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'تم استنفاد عدد مرات استخدام الكوبون' };
  }

  // التحقق من الحد الأدنى للطلب
  if (this.minimumAmount && orderAmount < this.minimumAmount) {
    return { 
      valid: false, 
      message: `الحد الأدنى للطلب ${this.minimumAmount} ر.س` 
    };
  }

  return { valid: true };
};

// حساب قيمة الخصم
couponSchema.methods.calculateDiscount = function(orderAmount) {
  const validation = this.isValid(orderAmount);
  if (!validation.valid) {
    return { discount: 0, error: validation.message };
  }

  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    // تطبيق الحد الأقصى للخصم إن وجد
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountValue;
  }

  // التأكد من أن الخصم لا يتجاوز قيمة الطلب
  discount = Math.min(discount, orderAmount);

  return { discount: Math.round(discount * 100) / 100 };
};

// Index للبحث السريع
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ expiryDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon; 