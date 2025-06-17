import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  otp: {
    code: String,
    expiresAt: Date,
    verified: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-increment ID
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const lastCustomer = await this.constructor.findOne().sort({ id: -1 });
      this.id = lastCustomer ? lastCustomer.id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  
  // Update name field
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
customerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Generate OTP
customerSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    verified: false
  };
  return otp;
};

// Verify OTP
customerSchema.methods.verifyOTP = function(inputOtp) {
  if (!this.otp || !this.otp.code) {
    return { valid: false, message: 'لم يتم إرسال كود التحقق' };
  }
  
  if (this.otp.expiresAt < new Date()) {
    return { valid: false, message: 'انتهت صلاحية كود التحقق' };
  }
  
  if (this.otp.code !== inputOtp) {
    return { valid: false, message: 'كود التحقق غير صحيح' };
  }
  
  this.otp.verified = true;
  return { valid: true, message: 'تم التحقق بنجاح' };
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer; 