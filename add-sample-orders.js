import mongoose from 'mongoose';
import Order from './models/Order.js';
import { config, getMongoUri } from './config.js';

async function connectDB() {
  try {
    await mongoose.connect(getMongoUri(), config.mongodb.options);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function addSampleOrders() {
  try {
    await connectDB();

    const sampleOrders = [
      {
        id: 1,
        customerName: 'أحمد محمد علي',
        customerEmail: 'ahmed@example.com',
        customerPhone: '0501234567',
        address: 'شارع الملك فهد، حي العليا',
        city: 'الرياض',
        items: [
          {
            productId: 1,
            productName: 'تمر العجوة الفاخر',
            price: 85.50,
            quantity: 2,
            totalPrice: 171.00
          },
          {
            productId: 2,
            productName: 'عسل السدر الطبيعي',
            price: 120.00,
            quantity: 1,
            totalPrice: 120.00
          }
        ],
        subtotal: 291.00,
        deliveryFee: 25,
        couponCode: 'SAVE20',
        couponDiscount: 20,
        total: 296.00, // 291 + 25 - 20
        paymentMethod: 'cash',
        status: 'pending',
        notes: 'التوصيل في المساء بعد المغرب'
      },
      {
        id: 2,
        customerName: 'فاطمة عبدالله',
        customerEmail: 'fatima@example.com',
        customerPhone: '0507654321',
        address: 'شارع التحلية، حي الزهراء',
        city: 'جدة',
        items: [
          {
            productId: 3,
            productName: 'زيت الزيتون البكر',
            price: 45.75,
            quantity: 3,
            totalPrice: 137.25
          }
        ],
        subtotal: 137.25,
        deliveryFee: 30,
        total: 167.25,
        paymentMethod: 'card',
        status: 'confirmed',
        notes: ''
      },
      {
        id: 3,
        customerName: 'خالد السعيد',
        customerEmail: 'khalid@example.com',
        customerPhone: '0509876543',
        address: 'حي الملقا، شارع الأمير محمد',
        city: 'الرياض',
        items: [
          {
            productId: 1,
            productName: 'تمر العجوة الفاخر',
            price: 85.50,
            quantity: 1,
            totalPrice: 85.50
          },
          {
            productId: 4,
            productName: 'حبوب القهوة العربية',
            price: 65.00,
            quantity: 2,
            totalPrice: 130.00
          }
        ],
        subtotal: 215.50,
        deliveryFee: 25,
        total: 240.50,
        paymentMethod: 'cash',
        status: 'shipped',
        notes: 'يرجى الاتصال قبل التوصيل'
      },
      {
        id: 4,
        customerName: 'نورا أحمد',
        customerEmail: 'nora@example.com',
        customerPhone: '0502345678',
        address: 'شارع الأمير سلطان، حي النزهة',
        city: 'جدة',
        items: [
          {
            productId: 2,
            productName: 'عسل السدر الطبيعي',
            price: 120.00,
            quantity: 1,
            totalPrice: 120.00
          }
        ],
        subtotal: 120.00,
        deliveryFee: 30,
        total: 150.00,
        paymentMethod: 'bank_transfer',
        status: 'delivered',
        notes: '',
        deliveredAt: new Date(Date.now() - 86400000) // أمس
      },
      {
        id: 5,
        customerName: 'محمد الغامدي',
        customerEmail: 'mohammed@example.com',
        customerPhone: '0551234567',
        address: 'حي الورود، شارع الستين',
        city: 'الرياض',
        items: [
          {
            productId: 3,
            productName: 'زيت الزيتون البكر',
            price: 45.75,
            quantity: 2,
            totalPrice: 91.50
          },
          {
            productId: 4,
            productName: 'حبوب القهوة العربية',
            price: 65.00,
            quantity: 1,
            totalPrice: 65.00
          }
        ],
        subtotal: 156.50,
        deliveryFee: 25,
        couponCode: 'FIRST10',
        couponDiscount: 15,
        total: 166.50, // 156.50 + 25 - 15
        paymentMethod: 'cash',
        status: 'preparing',
        notes: 'طلب عاجل'
      }
    ];

    // إزالة الطلبات الموجودة
    await Order.deleteMany({});
    console.log('🗑️  Cleared existing orders');

    // إضافة الطلبات الجديدة
    for (const orderData of sampleOrders) {
      const order = new Order(orderData);
      await order.save();
      console.log(`✅ Added order #${order.id} for ${order.customerName}`);
    }

    console.log(`🎉 Successfully added ${sampleOrders.length} sample orders!`);
    
    // عرض إحصائيات
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ]);

    console.log('\n📊 Order Statistics:');
    orderStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} orders, ${stat.totalValue.toFixed(2)} ر.س`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample orders:', error);
    process.exit(1);
  }
}

addSampleOrders(); 