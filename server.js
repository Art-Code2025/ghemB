const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ahmedmaher:ahmedmaher@cluster0.ixqhj.mongodb.net/mawasiem?retryWrites=true&w=majority&appName=Cluster0';

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://ghemf.netlify.app',  // Netlify frontend URL
    'https://ghemf.netlify.app/', // With trailing slash
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

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ======================
// AUTHENTICATION APIs (Login, Register)
// ======================

// Simple Customer schema for authentication
const customers = [];
let nextCustomerId = 1;

// Helper function to find customer by email
const findCustomerByEmail = (email) => {
  return customers.find(customer => customer.email.toLowerCase() === email.toLowerCase());
};

// Helper function to hash password (simple version)
const hashPassword = (password) => {
  // Simple hash - in production use bcrypt
  return Buffer.from(password).toString('base64');
};

// Helper function to compare password
const comparePassword = (password, hashedPassword) => {
  return hashPassword(password) === hashedPassword;
};

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔒 Login attempt for email: ${email}`);

    // التحقق من المدخلات
    if (!email || !password) {
      console.log('⚠️ Login failed: Missing email or password');
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    // البحث عن المستخدم
    const customer = findCustomerByEmail(email);
    if (!customer) {
      console.log(`⚠️ Login failed: User not found for email: ${email}`);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // مقارنة كلمة المرور
    const isMatch = comparePassword(password, customer.password);
    if (!isMatch) {
      console.log(`⚠️ Login failed: Invalid password for email: ${email}`);
      return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
    }
    
    // إزالة كلمة المرور من بيانات المستخدم قبل إرسالها
    const userResponse = { ...customer };
    delete userResponse.password;

    console.log(`✅ Login successful for user: ${email}`);
    res.json({ message: 'تم تسجيل الدخول بنجاح', user: userResponse });

  } catch (error) {
    console.error('❌ Error in /api/auth/login:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    console.log(`📝 Registration attempt for email: ${email}`);

    // التحقق من المدخلات
    if (!email || !password || !firstName || !lastName || !phone) {
      console.log('⚠️ Registration failed: Missing required fields');
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    // التحقق من وجود المستخدم
    const existingCustomer = findCustomerByEmail(email);
    if (existingCustomer) {
      console.log(`⚠️ Registration failed: Email already exists: ${email}`);
      return res.status(409).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
    }

    // إنشاء مستخدم جديد
    const newCustomer = {
      id: nextCustomerId++,
      email: email.toLowerCase(),
      password: hashPassword(password),
      firstName,
      lastName,
      phone,
      name: `${firstName} ${lastName}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    
    // إزالة كلمة المرور من بيانات المستخدم قبل إرسالها
    const userResponse = { ...newCustomer };
    delete userResponse.password;

    console.log(`✅ Registration successful for user: ${email}`);
    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح', user: userResponse });

  } catch (error) {
    console.error('❌ Error in /api/auth/register:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Mawasiem Server is running!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints available: /api/auth/login, /api/auth/register`);
});

// ... rest of the server code ... 