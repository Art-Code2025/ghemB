import nodemailer from 'nodemailer';
import { config } from '../config.js';

// إنشاء transporter للإيميل
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: config.email.service,
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.auth.user,
      pass: config.email.auth.pass
    },
    pool: config.email.pool,
    maxConnections: config.email.maxConnections,
    rateDelta: config.email.rateDelta,
    rateLimit: config.email.rateLimit,
    tls: config.email.tls
  });

  // اختبار اتصال Gmail
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Gmail SMTP Error:', error.message);
      console.log('💡 Please check Gmail credentials and enable App Password');
    } else {
      console.log('✅ Gmail SMTP Ready - Mawasim Store service');
    }
  });

  return transporter;
};

// إرسال OTP عبر الإيميل
export const sendOTPEmail = async (email, otp, customerName = 'عزيزي العميل') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: config.email.from.name,
        address: config.email.from.address
      },
      to: email,
      subject: 'كود التحقق - ghem.store',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'Reply-To': config.email.from.address,
        'Return-Path': config.email.from.address
      },
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>كود التحقق</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              background-color: #f8f9fa;
              margin: 0;
              padding: 20px;
              direction: rtl;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              border: 1px solid #e9ecef;
            }
            .header {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              text-align: center;
              padding: 40px 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .header p {
              margin: 8px 0 0 0;
              opacity: 0.95;
              font-size: 16px;
              font-weight: 400;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .greeting {
              font-size: 18px;
              color: #374151;
              margin-bottom: 24px;
              font-weight: 500;
            }
            .otp-section {
              background: #f8fafc;
              border-radius: 12px;
              padding: 32px;
              margin: 32px 0;
              border: 2px dashed #e2e8f0;
            }
            .otp-label {
              color: #64748b;
              margin-bottom: 12px;
              font-size: 14px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 700;
              color: #4f46e5;
              letter-spacing: 8px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              margin: 16px 0;
            }
            .instructions {
              background-color: #f0f9ff;
              border: 1px solid #e0f2fe;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              text-align: right;
            }
            .instructions h3 {
              color: #0369a1;
              margin: 0 0 12px 0;
              font-size: 16px;
              font-weight: 600;
            }
            .instructions ul {
              margin: 0;
              padding: 0 20px;
              color: #374151;
            }
            .instructions li {
              margin: 8px 0;
              font-size: 14px;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              color: #92400e;
              font-size: 14px;
            }
            .footer {
              background-color: #f8f9fa;
              text-align: center;
              padding: 24px;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e9ecef;
            }
            .footer a {
              color: #4f46e5;
              text-decoration: none;
            }
            .logo {
              font-size: 24px;
              margin-bottom: 8px;
            }
            .brand {
              font-weight: 700;
              color: #4f46e5;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛍️</div>
              <h1>ghem.store</h1>
              <p>كود التحقق الخاص بحسابك</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                مرحباً <strong>${customerName}</strong>
              </div>
              
              <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
                تم طلب كود التحقق للدخول إلى حسابك في متجر ghem.store
              </p>
              
              <div class="otp-section">
                <div class="otp-label">كود التحقق</div>
                <div class="otp-code">${otp}</div>
                <p style="color: #64748b; font-size: 14px; margin: 16px 0 0 0;">
                  صالح لمدة 10 دقائق
                </p>
              </div>
              
              <div class="instructions">
                <h3>📋 تعليمات مهمة:</h3>
                <ul>
                  <li>أدخل هذا الكود في صفحة التحقق خلال 10 دقائق</li>
                  <li>الكود صالح لمرة واحدة فقط</li>
                  <li>لا تشارك هذا الكود مع أي شخص آخر</li>
                  <li>إذا لم تطلب هذا الكود، تجاهل هذا الإيميل</li>
                </ul>
              </div>
              
              <div class="warning">
                ⚠️ <strong>تنبيه أمني:</strong> فريق ghem.store لن يطلب منك كود التحقق أبداً عبر الهاتف أو إيميل آخر
              </div>
            </div>
            
            <div class="footer">
              <p>
                شكراً لثقتك في <a href="#" class="brand">ghem.store</a>
              </p>
              <p>فريق خدمة العملاء | جميع الحقوق محفوظة</p>
              <p style="margin-top: 12px;">
                <a href="#">إلغاء الاشتراك</a> | 
                <a href="#">سياسة الخصوصية</a> | 
                <a href="#">تواصل معنا</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
مرحباً ${customerName},

كود التحقق الخاص بك من ghem.store هو: ${otp}

يرجى إدخال هذا الكود خلال 10 دقائق.
الكود صالح لمرة واحدة فقط.

إذا لم تطلب هذا الكود، تجاهل هذا الإيميل.

شكراً لثقتك،
فريق ghem.store
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// إرسال إيميل ترحيب للعملاء الجدد
export const sendWelcomeEmail = async (email, customerName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: config.email.from.name,
        address: config.email.from.address
      },
      to: email,
      subject: '🎉 مرحباً بك في ghem.store',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-align: center; padding: 30px; }
            .content { padding: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛍️ ghem.store</h1>
              <p>مرحباً بك في عائلتنا!</p>
            </div>
            <div class="content">
              <h2>مرحباً ${customerName}! 👋</h2>
              <p>نحن سعداء لانضمامك إلى ghem.store. ستجد لدينا أفضل المنتجات بأجود الأسعار.</p>
              <p>يمكنك الآن:</p>
              <ul>
                <li>تصفح مجموعتنا المتنوعة من المنتجات</li>
                <li>إضافة المنتجات إلى سلة التسوق</li>
                <li>الاستفادة من العروض والخصومات</li>
                <li>تتبع طلباتك بسهولة</li>
              </ul>
              <p>شكراً لثقتك بنا! 💜</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

export default { sendOTPEmail, sendWelcomeEmail }; 