import mongoose from 'mongoose';
import { config, getMongoUri } from '../config.js';
import Coupon from '../models/Coupon.js';
import Customer from '../models/Customer.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';

async function connectDB() {
  try {
    await mongoose.connect(getMongoUri(), config.mongodb.options);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function addSimpleData() {
  console.log('🌱 Adding simple data...');

  try {
    // Clear existing data
    await Coupon.deleteMany({});
    await Customer.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});

    // Add simple coupons with manual IDs
    const coupon1 = await new Coupon({
      id: 1,
      name: 'خصم الصيف',
      code: 'SUMMER25',
      description: 'خصم 20%',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: 200,
      isActive: true
    }).save();

    const coupon2 = await new Coupon({
      id: 2,
      name: 'خصم العملاء الجدد', 
      code: 'NEW50',
      description: 'خصم 50 ريال',
      discountType: 'fixed',
      discountValue: 50,
      isActive: true
    }).save();

    console.log('✅ Added 2 coupons');

    // Add simple customers
    const customer1 = await new Customer({
      id: 1,
      name: 'أحمد محمد',
      email: 'ahmed@test.com',
      phone: '0501234567',
      city: 'الرياض',
      totalOrders: 5,
      totalSpent: 2500
    }).save();

    const customer2 = await new Customer({
      id: 2,
      name: 'فاطمة علي',
      email: 'fatima@test.com', 
      phone: '0509876543',
      city: 'جدة',
      totalOrders: 3,
      totalSpent: 1800
    }).save();

    console.log('✅ Added 2 customers');

    // Add cart items
    await new Cart({
      id: 1,
      userId: '1',
      productId: 1,
      productName: 'تنظيف مكيفات',
      price: 200,
      quantity: 1
    }).save();

    await new Cart({
      id: 2, 
      userId: '1',
      productId: 2,
      productName: 'تنظيف خزانات',
      price: 350,
      quantity: 1
    }).save();

    console.log('✅ Added 2 cart items');

    // Add wishlist items
    await new Wishlist({
      id: 1,
      userId: '1',
      productId: 3,
      productName: 'تنظيف سجاد',
      price: 150
    }).save();

    await new Wishlist({
      id: 2,
      userId: '2', 
      productId: 4,
      productName: 'تنظيف كنب',
      price: 300
    }).save();

    console.log('✅ Added 2 wishlist items');

    console.log('\n🎉 Simple data added successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  await connectDB();
  await addSimpleData();
  await mongoose.disconnect();
  console.log('✅ Done');
}

main().catch(console.error); 