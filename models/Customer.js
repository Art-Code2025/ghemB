import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  name: { type: String, required: true },
  city: { type: String, default: '' },
  
  // إحصائيات بسيطة
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastOrderDate: { type: Date },
  
  // حالة بسيطة
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  
  // OTP بسيط للتحقق فقط
  otp: {
    code: { type: String },
    expiresAt: { type: Date }
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment ID
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastCustomer = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastCustomer ? lastCustomer.id + 1 : 1;
  }
  next();
});

// إنشاء OTP بسيط (4 أرقام)
customerSchema.methods.generateOTP = function() {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4 أرقام بدلاً من 6
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  this.otp = { code: otp, expiresAt };
  return otp;
};

// التحقق من OTP بسيط
customerSchema.methods.verifyOTP = function(inputOTP) {
  if (!this.otp || !this.otp.code) {
    return { valid: false, message: 'لم يتم إرسال كود التحقق' };
  }
  
  if (new Date() > this.otp.expiresAt) {
    return { valid: false, message: 'انتهت صلاحية كود التحقق' };
  }
  
  if (this.otp.code !== inputOTP) {
    return { valid: false, message: 'كود التحقق غير صحيح' };
  }
  
  this.otp = undefined;
  return { valid: true, message: 'تم التحقق بنجاح' };
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer; 