import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, getMongoUri } from './config.js';

// Import Models
import Coupon from './models/Coupon.js';
import Customer from './models/Customer.js';
import Cart from './models/Cart.js';
import Wishlist from './models/Wishlist.js';
import Order from './models/Order.js';
import Review from './models/Review.js';

// Import Email Service
import { sendOTPEmail, sendWelcomeEmail } from './services/emailService.js';

// محاكاة __dirname في ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://ghemf.netlify.app',  // Old Netlify URL (keep for backup)
    'https://ghemf.netlify.app/', // With trailing slash
    // Custom domains - PRODUCTION READY 🚀
    'https://ghem.store',         // Main domain
    'https://www.ghem.store',     // With www
    'http://ghem.store',          // HTTP version (for redirects)
    'http://www.ghem.store',      // HTTP with www
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// إعدادات Multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public/images/');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// إعداد أساسي يتعامل مع أي نوع من الحقول
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('فقط ملفات الصور مسموحة!'), false);
    }
  }
});

// Middleware للتعامل مع جميع أنواع الملفات
const uploadFiles = upload.any();

// معالج أخطاء Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'حجم الملف كبير جداً (الحد الأقصى 5MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'عدد الملفات كبير جداً' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'نوع ملف غير متوقع' });
    }
    return res.status(400).json({ message: 'خطأ في رفع الملف: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(handleMulterError);

// MongoDB Schemas
const categorySchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  description: String,
  image: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: null },
  stock: { type: Number, default: 0 },
  categoryId: { type: Number, required: true },
  
  // Product Type and Dynamic Fields
  productType: {
    type: String,
    required: true,
    enum: ['وشاح وكاب', 'جاكيت', 'عباية تخرج', 'مريول مدرسي', 'كاب فقط'],
    default: 'وشاح وكاب'
  },
  
  // Dynamic options based on product type
  dynamicOptions: [{
    optionName: String,
    optionType: { type: String, enum: ['select', 'text', 'number', 'radio'] },
    required: { type: Boolean, default: false },
    options: [{
      value: String,
      label: String,
      price: { type: Number, default: 0 }
    }],
    placeholder: String,
    validation: {
      minLength: Number,
      maxLength: Number,
      pattern: String
    }
  }],
  
  mainImage: String,
  detailedImages: [String],
  sizeGuideImage: String,
  specifications: [{
    name: String,
    value: String
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment ID for new documents
categorySchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastCategory = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastCategory ? lastCategory.id + 1 : 1;
  }
  next();
});

productSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastProduct = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastProduct ? lastProduct.id + 1 : 1;
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(getMongoUri(), config.mongodb.options);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// ======================
// CATEGORIES APIs
// ======================
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ id: parseInt(req.params.id), isActive: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error in GET /api/categories/:id:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
});

app.post('/api/categories', uploadFiles, async (req, res) => {
  try {
    console.log('Creating category with data:', req.body);
    console.log('Files received:', req.files);
    
    const { name, description } = req.body;
    const imageFile = req.files?.find(f => f.fieldname === 'mainImage');
    
    const category = new Category({
      name,
      description: description || '',
      image: imageFile ? `/images/${imageFile.filename}` : ''
    });

    await category.save();
    console.log('Category created successfully:', category);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
});

app.put('/api/categories/:id', uploadFiles, async (req, res) => {
  try {
    const { name, description } = req.body;
    const imageFile = req.files?.find(f => f.fieldname === 'mainImage');

    const updateData = {
      name,
      description: description || ''
    };

    if (imageFile) {
      updateData.image = `/images/${imageFile.filename}`;
    }

    const category = await Category.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      updateData,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error in PUT /api/categories/:id:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Check if category has products
    const productCount = await Product.countDocuments({ categoryId, isActive: true });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It has ${productCount} products.` 
      });
    }

    const category = await Category.findOneAndUpdate(
      { id: categoryId },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/categories/:id:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// ======================
// PRODUCTS APIs
// ======================
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id), isActive: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error in GET /api/products/:id:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

app.get('/api/products/category/:categoryId', async (req, res) => {
  try {
    const products = await Product.find({ 
      categoryId: parseInt(req.params.categoryId), 
      isActive: true 
    }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error in GET /api/products/category/:categoryId:', error);
    res.status(500).json({ message: 'Failed to fetch products by category' });
  }
});

app.post('/api/products', uploadFiles, async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    console.log('Files received:', req.files);
    
    const { name, description, price, originalPrice, stock, categoryId, specifications, productType, dynamicOptions } = req.body;
    const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
    const detailedImageFiles = req.files?.filter(f => f.fieldname === 'detailedImages') || [];

    let parsedSpecifications = [];
    if (specifications) {
      try {
        parsedSpecifications = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (error) {
        console.error('Error parsing specifications:', error);
      }
    }

    let parsedDynamicOptions = [];
    if (dynamicOptions) {
      try {
        parsedDynamicOptions = typeof dynamicOptions === 'string' 
          ? JSON.parse(dynamicOptions) 
          : dynamicOptions;
      } catch (error) {
        console.error('Error parsing dynamic options:', error);
      }
    }

    const product = new Product({
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice && parseFloat(originalPrice) > 0 ? parseFloat(originalPrice) : null,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
      productType: productType || 'وشاح وكاب',
      dynamicOptions: parsedDynamicOptions,
      mainImage: mainImageFile ? `/images/${mainImageFile.filename}` : '',
      detailedImages: detailedImageFiles.map(file => `/images/${file.filename}`),
      sizeGuideImage: '',
      specifications: parsedSpecifications
    });

    await product.save();
    console.log('Product created successfully:', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
});

app.put('/api/products/:id', uploadFiles, async (req, res) => {
  try {
    const { name, description, price, originalPrice, stock, categoryId, specifications, productType, dynamicOptions } = req.body;
    const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
    const detailedImageFiles = req.files?.filter(f => f.fieldname === 'detailedImages') || [];

    let parsedSpecifications = [];
    if (specifications) {
      try {
        parsedSpecifications = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (error) {
        console.error('Error parsing specifications:', error);
      }
    }

    let parsedDynamicOptions = [];
    if (dynamicOptions) {
      try {
        parsedDynamicOptions = typeof dynamicOptions === 'string' 
          ? JSON.parse(dynamicOptions) 
          : dynamicOptions;
      } catch (error) {
        console.error('Error parsing dynamic options:', error);
      }
    }

    const updateData = {
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice && parseFloat(originalPrice) > 0 ? parseFloat(originalPrice) : null,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
      productType: productType || 'وشاح وكاب',
      dynamicOptions: parsedDynamicOptions,
      specifications: parsedSpecifications,
      sizeGuideImage: ''
    };

    if (mainImageFile) {
      updateData.mainImage = `/images/${mainImageFile.filename}`;
    }

    if (detailedImageFiles.length > 0) {
      updateData.detailedImages = detailedImageFiles.map(file => `/images/${file.filename}`);
    }

    const product = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error in PUT /api/products/:id:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/products/:id:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Get default options for product type
app.get('/api/products/default-options/:productType', async (req, res) => {
  try {
    const { productType } = req.params;
    
    const defaultOptions = {
      'وشاح وكاب': [
        {
          optionName: 'nameOnSash',
          optionType: 'text',
          required: true,
          placeholder: 'الاسم على الوشاح (ثنائي أو ثلاثي)',
          validation: { minLength: 2, maxLength: 50 }
        },
        {
          optionName: 'embroideryColor',
          optionType: 'select',
          required: true,
          options: [
            { value: 'ذهبي' },
            { value: 'فضي' },
            { value: 'أسود' },
            { value: 'أبيض' },
            { value: 'أحمر' },
            { value: 'أزرق' }
          ]
        },
        {
          optionName: 'capFabric',
          optionType: 'select',
          required: true,
          options: [
            { value: 'قطن' },
            { value: 'حرير' },
            { value: 'بوليستر' },
            { value: 'صوف' }
          ]
        }
      ],
      'جاكيت': [
        {
          optionName: 'size',
          optionType: 'select',
          required: true,
          options: [
            { value: 'XS' },
            { value: 'S' },
            { value: 'M' },
            { value: 'L' },
            { value: 'XL' },
            { value: '2XL' }
          ]
        }
      ],
      'عباية تخرج': [
        {
          optionName: 'size',
          optionType: 'select',
          required: true,
          options: [
            { value: '48' },
            { value: '50' },
            { value: '52' },
            { value: '54' },
            { value: '56' },
            { value: '58' },
            { value: '60' }
          ]
        },
        {
          optionName: 'nameOnSash',
          optionType: 'text',
          required: false,
          placeholder: 'الاسم على الوشاح (ثنائي أو ثلاثي)',
          validation: { minLength: 2, maxLength: 50 }
        },
        {
          optionName: 'embroideryColor',
          optionType: 'select',
          required: true,
          options: [
            { value: 'ذهبي' },
            { value: 'فضي' },
            { value: 'أسود' },
            { value: 'أبيض' },
            { value: 'أحمر' },
            { value: 'أزرق' }
          ]
        }
      ],
      'مريول مدرسي': [
        {
          optionName: 'size',
          optionType: 'select',
          required: true,
          options: [
            { value: '34' },
            { value: '36' },
            { value: '38' },
            { value: '40' },
            { value: '42' },
            { value: '44' },
            { value: '46' },
            { value: '48' },
            { value: '50' },
            { value: '52' },
            { value: '54' }
          ]
        }
      ],
      'كاب فقط': [
        {
          optionName: 'capColor',
          optionType: 'select',
          required: true,
          options: [
            { value: 'أسود' },
            { value: 'كحلي' },
            { value: 'أبيض' },
            { value: 'رمادي' },
            { value: 'بني' },
            { value: 'عنابي' }
          ]
        },
        {
          optionName: 'embroideryColor',
          optionType: 'select',
          required: true,
          options: [
            { value: 'ذهبي' },
            { value: 'فضي' },
            { value: 'أبيض' },
            { value: 'أسود' },
            { value: 'أحمر' },
            { value: 'أزرق' }
          ]
        },
        {
          optionName: 'dandoshColor',
          optionType: 'select',
          required: true,
          options: [
            { value: 'ذهبي' },
            { value: 'فضي' },
            { value: 'أسود' },
            { value: 'أبيض' },
            { value: 'أحمر' },
            { value: 'أزرق' }
          ]
        }
      ]
    };
    
    const options = defaultOptions[productType] || [];
    res.json(options);
  } catch (error) {
    console.error('Error in GET /api/products/default-options:', error);
    res.status(500).json({ message: 'Failed to get default options' });
  }
});

// ======================
// ORDERS APIs (حقيقية مش وهمية!)
// ======================
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ id: parseInt(req.params.id) });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error in GET /api/orders/:id:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// إنشاء طلب جديد من السلة
app.post('/api/orders', async (req, res) => {
  try {
    console.log('Creating order with data:', req.body);
    
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      items,
      couponCode,
      paymentMethod,
      notes,
      deliveryFee = 0
    } = req.body;

    // التحقق من الكوبون إن وجد
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountResult = coupon.calculateDiscount(subtotal);
        if (!discountResult.error) {
          couponDiscount = discountResult.discount;
          // زيادة عدد مرات الاستخدام
          coupon.usedCount += 1;
          await coupon.save();
        }
      }
    }

    const order = new Order({
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      items,
      deliveryFee,
      couponCode: couponCode || '',
      couponDiscount,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || ''
    });

    await order.save();
    
    // إزالة العناصر من السلة بعد إنشاء الطلب
    await Cart.deleteMany({ userId: req.body.userId || 'guest' });
    
    console.log('Order created successfully:', order);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

// تحديث حالة الطلب
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);
    
    const order = await Order.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Error in PUT /api/orders/:id/status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// حذف طلب
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    const order = await Order.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    await Order.deleteOne({ id: orderId });
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    console.error('Error in DELETE /api/orders/:id:', error);
    res.status(500).json({ message: 'فشل في حذف الطلب' });
  }
});

// إحصائيات الطلبات
app.get('/api/orders/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Error in GET /api/orders/stats:', error);
    res.status(500).json({ message: 'Failed to fetch order stats' });
  }
});

// ======================
// COUPONS APIs
// ======================
app.get('/api/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error('Error in GET /api/coupons:', error);
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
});

app.get('/api/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ id: parseInt(req.params.id) });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    console.error('Error in GET /api/coupons/:id:', error);
    res.status(500).json({ message: 'Failed to fetch coupon' });
  }
});

// Create coupon without file upload
app.post('/api/coupons', async (req, res) => {
  try {
    console.log('Creating coupon with data:', req.body);
    
    // Auto-generate ID if not provided
    if (!req.body.id) {
      const lastCoupon = await Coupon.findOne().sort({ id: -1 });
      req.body.id = lastCoupon ? lastCoupon.id + 1 : 1;
    }
    
    const coupon = new Coupon(req.body);
    await coupon.save();
    console.log('Coupon created successfully:', coupon);
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error in POST /api/coupons:', error);
    res.status(500).json({ message: 'Failed to create coupon', error: error.message });
  }
});

app.put('/api/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    console.error('Error in PUT /api/coupons/:id:', error);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ id: parseInt(req.params.id) });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/coupons/:id:', error);
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
});

// Validate coupon
app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, totalAmount } = req.body;
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'كوبون غير صحيح' });
    }

    const result = coupon.calculateDiscount(totalAmount);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      coupon: coupon,
      discountAmount: result.discount
    });
  } catch (error) {
    console.error('Error in POST /api/coupons/validate:', error);
    res.status(500).json({ message: 'Failed to validate coupon' });
  }
});

// ======================
// CART APIs
// ======================
app.get('/api/cart', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const items = await Cart.find({ userId }).sort({ createdAt: -1 });
    
    // إضافة بيانات المنتج لكل عنصر
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await Product.findOne({ id: item.productId });
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || {},  // إضافة المواصفات المختارة
        optionsPricing: item.optionsPricing || {},    // إضافة أسعار الخيارات
        attachments: item.attachments || {},          // إضافة المرفقات
        product: product ? {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          mainImage: product.mainImage,
          detailedImages: product.detailedImages || [],
          stock: product.stock,
          productType: product.productType,
          dynamicOptions: product.dynamicOptions || [],
          specifications: product.specifications || [],
          sizeGuideImage: product.sizeGuideImage
        } : null
      };
    }));
    
    res.json(itemsWithProducts);
  } catch (error) {
    console.error('Error in GET /api/cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const { userId = 'guest', productId, productName, price, quantity = 1, image = '' } = req.body;
    
    // Check if item already exists
    const existingItem = await Cart.findOne({ userId, productId });
    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
      return res.json(existingItem);
    }

    const cartItem = new Cart({
      userId,
      productId,
      productName,
      price,
      quantity,
      image
    });

    await cartItem.save();
    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Error in POST /api/cart:', error);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
});

app.put('/api/cart/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await Cart.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { quantity: parseInt(quantity) },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error in PUT /api/cart/:id:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
});

app.delete('/api/cart/:id', async (req, res) => {
  try {
    const item = await Cart.findOneAndDelete({ id: parseInt(req.params.id) });

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error in DELETE /api/cart/:id:', error);
    res.status(500).json({ message: 'Failed to remove from cart' });
  }
});

// Clear cart
app.delete('/api/cart', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    await Cart.deleteMany({ userId });
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cart:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});

// ======================
// WISHLIST APIs
// ======================
app.get('/api/wishlist', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const items = await Wishlist.find({ userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Error in GET /api/wishlist:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
});

app.post('/api/wishlist', async (req, res) => {
  try {
    const { userId = 'guest', productId, productName, price, image = '' } = req.body;
    
    // Check if item already exists
    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      return res.status(400).json({ message: 'المنتج موجود بالفعل في المفضلة' });
    }

    const wishlistItem = new Wishlist({
      userId,
      productId,
      productName,
      price,
      image
    });

    await wishlistItem.save();
    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error('Error in POST /api/wishlist:', error);
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
});

app.delete('/api/wishlist/:id', async (req, res) => {
  try {
    const item = await Wishlist.findOneAndDelete({ id: parseInt(req.params.id) });

    if (!item) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error in DELETE /api/wishlist/:id:', error);
    res.status(500).json({ message: 'Failed to remove from wishlist' });
  }
});

// Check if product is in wishlist
app.get('/api/wishlist/check/:productId', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const productId = parseInt(req.params.productId);
    
    const item = await Wishlist.findOne({ userId, productId });
    res.json({ inWishlist: !!item });
  } catch (error) {
    console.error('Error in GET /api/wishlist/check/:productId:', error);
    res.status(500).json({ message: 'Failed to check wishlist' });
  }
});

// ======================
// CUSTOMERS APIs
// ======================
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find({ status: 'active' }).sort({ createdAt: -1 });
    
    // Add cart and wishlist stats
    const customersWithStats = await Promise.all(customers.map(async (customer) => {
      const cartItemsCount = await Cart.countDocuments({ userId: customer.id.toString() });
      const wishlistItemsCount = await Wishlist.countDocuments({ userId: customer.id.toString() });
      
      return {
        ...customer.toObject(),
        cartItemsCount,
        wishlistItemsCount,
        hasCart: cartItemsCount > 0,
        hasWishlist: wishlistItemsCount > 0
      };
    }));

    res.json(customersWithStats);
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

// Customer stats endpoint
app.get('/api/customers/stats', async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments({ status: 'active' });
    const activeCustomers = await Customer.countDocuments({ status: 'active' });
    const totalCartItems = await Cart.countDocuments();
    const totalWishlistItems = await Wishlist.countDocuments();
    
    // Calculate averages
    const avgCartItems = totalCustomers > 0 ? (totalCartItems / totalCustomers).toFixed(1) : 0;
    const avgWishlistItems = totalCustomers > 0 ? (totalWishlistItems / totalCustomers).toFixed(1) : 0;

    res.json({
      totalCustomers,
      activeCustomers,
      totalCartItems,
      totalWishlistItems,
      avgCartItems: parseFloat(avgCartItems),
      avgWishlistItems: parseFloat(avgWishlistItems)
    });
  } catch (error) {
    console.error('Error in GET /api/customers/stats:', error);
    res.status(500).json({ message: 'Failed to fetch customer stats' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error in POST /api/customers:', error);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// Send OTP
app.post('/api/customers/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({
        email,
        name: 'عميل جديد',
        phone: ''
      });
    }

    const otp = customer.generateOTP();
    await customer.save();

    // إرسال OTP عبر الإيميل الحقيقي
    console.log(`🔄 Sending OTP to ${email}: ${otp}`);
    const emailResult = await sendOTPEmail(email, otp, customer.name);
    
    if (emailResult.success) {
      console.log(`✅ OTP Email sent successfully to ${email}`);
      res.json({ 
        message: 'تم إرسال كود التحقق إلى إيميلك بنجاح ✉️',
        emailSent: true
      });
    } else {
      console.error(`❌ Failed to send OTP email to ${email}:`, emailResult.error);
      // في حالة فشل الإيميل، لا نزال نعطي الكود للمستخدم
      console.log(`📋 Backup OTP for ${email}: ${otp}`);
      res.json({ 
        message: 'تم إنشاء كود التحقق (تحقق من الإيميل أو الكونسول)',
        emailSent: false,
        backupOtp: otp // للتطوير فقط
      });
    }
  } catch (error) {
    console.error('Error in POST /api/customers/send-otp:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/api/customers/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: 'العميل غير موجود' });
    }

    const result = customer.verifyOTP(otp);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    await customer.save();
    res.json({ message: result.message, customer });
  } catch (error) {
    console.error('Error in POST /api/customers/verify-otp:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    
    // حذف العميل من قاعدة البيانات
    const result = await Customer.deleteOne({ id: customerId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }
    
    // حذف السلة وقائمة الأمنيات المرتبطة بالعميل
    await Cart.deleteMany({ userId: customerId });
    await Wishlist.deleteMany({ userId: customerId });
    
    console.log(`✅ Customer ${customerId} deleted successfully`);
    res.json({ message: 'تم حذف العميل بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({ error: 'فشل في حذف العميل' });
  }
});

// ======================
// REVIEWS APIs
// ======================

// Get reviews for a product
app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error in GET /api/products/:productId/reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Add a review
app.post('/api/products/:productId/reviews', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { customerId, customerName, comment } = req.body;
    
    if (!customerId || !customerName || !comment) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    const review = new Review({
      productId,
      customerId,
      customerName,
      comment
    });
    
    await review.save();
    res.status(201).json({ 
      message: 'تم إضافة تعليقك بنجاح!',
      review 
    });
  } catch (error) {
    console.error('Error in POST /api/products/:productId/reviews:', error);
    res.status(500).json({ message: 'Failed to add review' });
  }
});

// Get all reviews (for admin)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Delete review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    
    const review = await Review.findOneAndDelete({ id: reviewId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/reviews/:id:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const categoriesCount = await Category.countDocuments({ isActive: true });
    const productsCount = await Product.countDocuments({ isActive: true });
    const couponsCount = await Coupon.countDocuments({ isActive: true });
    const cartItemsCount = await Cart.countDocuments();
    const wishlistItemsCount = await Wishlist.countDocuments();
    const customersCount = await Customer.countDocuments({ status: 'active' });
    const ordersCount = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const reviewsCount = await Review.countDocuments();
    
    res.json({
      status: 'healthy',
      database: 'MongoDB',
      categories: categoriesCount,
      products: productsCount,
      coupons: couponsCount,
      cartItems: cartItemsCount,
      wishlistItems: wishlistItemsCount,
      customers: customersCount,
      orders: ordersCount,
      pendingOrders: pendingOrders,
      reviews: reviewsCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ======================
// AUTH APIs (للفرونت إند)
// ======================

// Send OTP for Authentication
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = new Customer({
        email,
        name: 'عميل جديد',
        phone: ''
      });
    }

    const otp = customer.generateOTP();
    await customer.save();

    // إرسال OTP عبر الإيميل الحقيقي
    console.log(`🔄 Sending OTP to ${email}: ${otp}`);
    const emailResult = await sendOTPEmail(email, otp, customer.name);
    
    if (emailResult.success) {
      console.log(`✅ OTP Email sent successfully to ${email}`);
      res.json({ 
        message: 'تم إرسال كود التحقق إلى إيميلك بنجاح ✉️',
        emailSent: true
      });
    } else {
      console.error(`❌ Failed to send OTP email to ${email}:`, emailResult.error);
      // في حالة فشل الإيميل، لا نزال نعطي الكود للمستخدم
      console.log(`📋 Backup OTP for ${email}: ${otp}`);
      res.json({ 
        message: 'تم إنشاء كود التحقق (تحقق من الإيميل أو الكونسول)',
        emailSent: false,
        otp: otp // للتطوير فقط
      });
    }
  } catch (error) {
    console.error('Error in POST /api/auth/send-otp:', error);
    res.status(500).json({ message: 'خطأ في الاتصال. حاول مرة أخرى' });
  }
});

// Verify OTP for Authentication
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: 'العميل غير موجود' });
    }

    const result = customer.verifyOTP(otp);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    // تحديد إذا كان عميل موجود أو جديد
    const isExistingUser = customer.name !== 'عميل جديد' && customer.phone !== '';
    
    await customer.save();
    
    res.json({ 
      message: result.message, 
      customer,
      isExistingUser,
      user: isExistingUser ? customer : null
    });
  } catch (error) {
    console.error('Error in POST /api/auth/verify-otp:', error);
    res.status(500).json({ message: 'خطأ في الاتصال. حاول مرة أخرى' });
  }
});

// Complete Registration for new users
app.post('/api/auth/complete-registration', async (req, res) => {
  try {
    const { email, firstName, lastName, phone } = req.body;
    
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: 'العميل غير موجود' });
    }

    // تحديث بيانات العميل
    customer.name = `${firstName} ${lastName}`;
    customer.phone = phone;
    await customer.save();

    res.json({ 
      message: 'تم إنشاء الحساب بنجاح',
      user: customer
    });
  } catch (error) {
    console.error('Error in POST /api/auth/complete-registration:', error);
    res.status(500).json({ message: 'خطأ في الاتصال. حاول مرة أخرى' });
  }
});

// ======================
// USER-SPECIFIC APIs (للتوافق مع الفرونت إند)
// ======================

// Get user's cart
app.get('/api/user/:userId/cart', async (req, res) => {
  try {
    const userId = req.params.userId;
    const items = await Cart.find({ userId }).sort({ createdAt: -1 });
    
    // إضافة بيانات المنتج لكل عنصر
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await Product.findOne({ id: item.productId });
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || {},  // إضافة المواصفات المختارة
        optionsPricing: item.optionsPricing || {},    // إضافة أسعار الخيارات
        attachments: item.attachments || {},          // إضافة المرفقات
        product: product ? {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          mainImage: product.mainImage,
          detailedImages: product.detailedImages || [],
          stock: product.stock,
          productType: product.productType,
          dynamicOptions: product.dynamicOptions || [],
          specifications: product.specifications || [],
          sizeGuideImage: product.sizeGuideImage
        } : null
      };
    }));
    
    res.json(itemsWithProducts);
  } catch (error) {
    console.error('Error in GET /api/user/:userId/cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// Add to user's cart
app.post('/api/user/:userId/cart', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { productId, quantity = 1, selectedOptions = {}, optionsPricing = {}, attachments = {} } = req.body;
    
    // الحصول على بيانات المنتج
    const product = await Product.findOne({ id: productId });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    // التحقق من وجود العنصر في السلة مع نفس الخيارات
    const existingItem = await Cart.findOne({ 
      userId, 
      productId,
      selectedOptions: selectedOptions 
    });
    
    if (existingItem) {
      existingItem.quantity += quantity;
      // تحديث المرفقات إذا كانت موجودة
      if (attachments && (attachments.text || attachments.images?.length > 0)) {
        existingItem.attachments = attachments;
      }
      await existingItem.save();
      return res.json(existingItem);
    }

    const cartItem = new Cart({
      userId,
      productId,
      productName: product.name,
      price: product.price,
      quantity,
      image: product.mainImage,
      selectedOptions: selectedOptions || {},
      optionsPricing: optionsPricing || {},
      attachments: attachments || {}
    });

    await cartItem.save();
    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Error in POST /api/user/:userId/cart:', error);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
});

// Update cart item quantity
app.put('/api/user/:userId/cart/:itemId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const itemId = parseInt(req.params.itemId);
    const { quantity, selectedOptions, optionsPricing, attachments, productId } = req.body;
    
    console.log(`🔄 Updating cart item ${itemId} for user ${userId}`);
    console.log('📦 Request body:', { quantity, selectedOptions, optionsPricing, attachments, productId });
    
    // تحضير البيانات للتحديث
    const updateData = {};
    
    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }
      updateData.quantity = quantity;
      console.log(`📊 Updating quantity to: ${quantity}`);
    }
    
    if (selectedOptions !== undefined) {
      updateData.selectedOptions = selectedOptions;
      console.log(`🎯 Updating selectedOptions:`, selectedOptions);
    }
    
    if (optionsPricing !== undefined) {
      updateData.optionsPricing = optionsPricing;
      console.log(`💰 Updating optionsPricing:`, optionsPricing);
    }
    
    if (attachments !== undefined) {
      updateData.attachments = attachments;
      console.log(`📎 Updating attachments:`, attachments);
    }
    
    if (productId !== undefined) {
      updateData.productId = productId;
      console.log(`🏷️ Updating productId to: ${productId}`);
    }
    
    // Try to find by id (number) first
    let item = await Cart.findOneAndUpdate(
      { id: itemId, userId },
      updateData,
      { new: true }
    );
    
    // If not found, try by _id (ObjectId) as fallback
    if (!item) {
      console.log(`🔄 Item not found by id, trying _id for item ${itemId}`);
      try {
        item = await Cart.findOneAndUpdate(
          { _id: itemId, userId },
          updateData,
          { new: true }
        );
      } catch (err) {
        console.log(`❌ Invalid ObjectId format: ${itemId}`);
      }
    }

    if (!item) {
      console.log(`❌ Cart item ${itemId} not found for user ${userId}`);
      return res.status(404).json({ message: 'Cart item not found' });
    }

    console.log(`✅ Cart item ${itemId} updated successfully for user ${userId}`);
    console.log(`✅ Final item state:`, {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      optionsPricing: item.optionsPricing,
      attachments: item.attachments
    });
    
    res.json({ 
      message: 'Cart item updated successfully', 
      item: {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions,
        optionsPricing: item.optionsPricing,
        attachments: item.attachments
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/user/:userId/cart/:itemId:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
});

// Remove product from cart by productId
app.delete('/api/user/:userId/cart/product/:productId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = parseInt(req.params.productId);
    
    const item = await Cart.findOneAndDelete({ userId, productId });

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error in DELETE /api/user/:userId/cart/product/:productId:', error);
    res.status(500).json({ message: 'Failed to remove from cart' });
  }
});

// Remove cart item by itemId
app.delete('/api/user/:userId/cart/:itemId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const itemId = parseInt(req.params.itemId);
    
    console.log(`🗑️ DELETE REQUEST RECEIVED`);
    console.log(`🗑️ User ID: ${userId} (type: ${typeof userId})`);
    console.log(`🗑️ Item ID: ${itemId} (type: ${typeof itemId})`);
    console.log(`🗑️ Raw Item ID from params: ${req.params.itemId}`);
    console.log(`🗑️ Request headers:`, req.headers);
    console.log(`🗑️ Attempting to delete cart item ${itemId} for user ${userId}`);
    
    // Try to find by id (number) first
    let item = await Cart.findOneAndDelete({ id: itemId, userId });
    
    // If not found, try by _id (ObjectId) as fallback
    if (!item) {
      console.log(`🔄 Item not found by id, trying _id for item ${itemId}`);
      try {
        item = await Cart.findOneAndDelete({ _id: itemId, userId });
      } catch (err) {
        console.log(`❌ Invalid ObjectId format: ${itemId}`);
      }
    }

    if (!item) {
      console.log(`❌ Cart item ${itemId} not found for user ${userId}`);
      return res.status(404).json({ message: 'Cart item not found' });
    }

    console.log(`✅ Cart item ${itemId} deleted successfully for user ${userId}`);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error in DELETE /api/user/:userId/cart/:itemId:', error);
    res.status(500).json({ message: 'Failed to remove from cart' });
  }
});

// Clear user's cart
app.delete('/api/user/:userId/cart', async (req, res) => {
  try {
    const userId = req.params.userId;
    await Cart.deleteMany({ userId });
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/user/:userId/cart:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});

// Get user's wishlist
app.get('/api/user/:userId/wishlist', async (req, res) => {
  try {
    const userId = req.params.userId;
    const items = await Wishlist.find({ userId }).sort({ createdAt: -1 });
    
    // إضافة بيانات المنتج لكل عنصر
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await Product.findOne({ id: item.productId });
      return {
        id: item.id,
        productId: item.productId,
        userId: item.userId,
        addedAt: item.createdAt,
        product: product ? {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          mainImage: product.mainImage,
          stock: product.stock
        } : null
      };
    }));
    
    res.json(itemsWithProducts);
  } catch (error) {
    console.error('Error in GET /api/user/:userId/wishlist:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
});

// Add to wishlist
app.post('/api/user/:userId/wishlist', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { productId } = req.body;
    
    // الحصول على بيانات المنتج
    const product = await Product.findOne({ id: productId });
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    // التحقق من وجود العنصر في قائمة الأمنيات
    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      return res.status(400).json({ message: 'المنتج موجود بالفعل في المفضلة' });
    }

    const wishlistItem = new Wishlist({
      userId,
      productId,
      productName: product.name,
      price: product.price,
      image: product.mainImage
    });

    await wishlistItem.save();
    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error('Error in POST /api/user/:userId/wishlist:', error);
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
});

// Remove from wishlist
app.delete('/api/user/:userId/wishlist/product/:productId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = parseInt(req.params.productId);
    
    const item = await Wishlist.findOneAndDelete({ userId, productId });

    if (!item) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error in DELETE /api/user/:userId/wishlist/product/:productId:', error);
    res.status(500).json({ message: 'Failed to remove from wishlist' });
  }
});

// Check if product is in user's wishlist
app.get('/api/user/:userId/wishlist/check/:productId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = parseInt(req.params.productId);
    
    const item = await Wishlist.findOne({ userId, productId });
    res.json({ isInWishlist: !!item });
  } catch (error) {
    console.error('Error in GET /api/user/:userId/wishlist/check/:productId:', error);
    res.status(500).json({ message: 'Failed to check wishlist' });
  }
});

// Upload attachment images
app.post('/api/upload-attachments', uploadFiles, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const imagePaths = req.files.map(file => `/images/${file.filename}`);
    res.json({ 
      message: 'Files uploaded successfully',
      imagePaths 
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Checkout endpoint
app.post('/api/checkout', async (req, res) => {
  try {
    const { items, customerInfo, paymentMethod, total, subtotal, deliveryFee, couponDiscount, appliedCoupon, paymentId, paymentStatus, userId } = req.body;
    
    console.log('Creating order with data:', {
      customerInfo,
      itemsCount: items.length,
      total,
      subtotal,
      deliveryFee,
      couponDiscount,
      paymentMethod,
      paymentStatus,
      userId
    });
    
    // تحضير عناصر الطلب - البيانات جاهزة من الفرونت إند
    const orderItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName || 'منتج غير معروف',
      price: item.price || 0,
      quantity: item.quantity || 1,
      totalPrice: item.totalPrice || (item.price * item.quantity),
      selectedOptions: item.selectedOptions || {},
      optionsPricing: item.optionsPricing || {},
      productImage: item.productImage || '',
      attachments: item.attachments || {}
    }));

    // استخدام القيم المحسوبة من الفرونت إند أو حساب قيم احتياطية
    const orderSubtotal = subtotal || orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const orderDeliveryFee = deliveryFee || 0;
    const orderCouponDiscount = couponDiscount || 0;
    const orderTotal = total || (orderSubtotal + orderDeliveryFee - orderCouponDiscount);

    // معلومات الكوبون
    let couponCode = '';
    if (appliedCoupon && appliedCoupon.code) {
      couponCode = appliedCoupon.code;
      // يمكن إضافة التحقق من الكوبون هنا إذا لزم الأمر
    }

    const order = new Order({
      customerName: customerInfo.name,
      customerEmail: customerInfo.email || '',
      customerPhone: customerInfo.phone || '',
      address: customerInfo.address,
      city: customerInfo.city,
      items: orderItems,
      subtotal: orderSubtotal,
      deliveryFee: orderDeliveryFee,
      total: orderTotal,
      couponCode,
      couponDiscount: orderCouponDiscount,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      notes: customerInfo.notes || ''
    });

    // إضافة معرف الدفع إذا كان متوفراً
    if (paymentId) {
      order.paymentId = paymentId;
    }

    await order.save();
    
    console.log('Order created successfully:', order.id);
    res.status(201).json({ 
      message: 'تم إرسال طلبك بنجاح!',
      orderId: order.id,
      order: {
        id: order.id,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderDate: order.orderDate
      }
    });
  } catch (error) {
    console.error('Error in POST /api/checkout:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

// Update cart item options (alternative endpoint for options-only updates)
app.put('/api/user/:userId/cart/update-options', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { productId, selectedOptions, attachments } = req.body;
    
    console.log(`🔄 Updating cart options for user ${userId}, product ${productId}`);
    console.log('📝 New options:', selectedOptions);
    console.log('📎 New attachments:', attachments);
    
    // العثور على العنصر في السلة
    const cartItem = await Cart.findOne({ userId, productId });
    if (!cartItem) {
      return res.status(404).json({ message: 'المنتج غير موجود في السلة' });
    }
    
    // تحديث الخيارات والمرفقات
    if (selectedOptions !== undefined) {
      cartItem.selectedOptions = selectedOptions;
    }
    if (attachments !== undefined) {
      cartItem.attachments = attachments;
    }
    
    await cartItem.save();
    
    console.log('✅ Cart options updated successfully');
    console.log('✅ Final cart item:', {
      id: cartItem.id,
      productId: cartItem.productId,
      selectedOptions: cartItem.selectedOptions,
      attachments: cartItem.attachments
    });
    
    res.json({ 
      message: 'تم تحديث خيارات المنتج بنجاح',
      cartItem: {
        id: cartItem.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        selectedOptions: cartItem.selectedOptions,
        optionsPricing: cartItem.optionsPricing,
        attachments: cartItem.attachments
      }
    });
  } catch (error) {
    console.error('❌ Error updating cart options:', error);
    res.status(500).json({ message: 'فشل في تحديث خيارات المنتج' });
  }
});

// ======================
// ORIGINAL APIs (تم الاحتفاظ بها للتوافق مع الداش بورد)
// ======================

// Start server
async function startServer() {
  await connectDB();
  
  app.listen(port, () => {
    console.log('🚀 Mawasiem Server with MongoDB is running!');
    console.log(`📍 Server: http://localhost:${port}`);
    console.log(`🗄️  Database: MongoDB`);
    console.log(`🔍 Health Check: http://localhost:${port}/api/health`);
    console.log(`🎯 Frontend: Remember to run 'cd frontend && npm run dev'`);
  });
}

startServer().catch(console.error); 