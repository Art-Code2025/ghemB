FROM node:18-alpine

# تعيين مجلد العمل
WORKDIR /app

# نسخ package.json و package-lock.json
COPY package*.json ./

# تثبيت dependencies
RUN npm ci --only=production

# نسخ باقي الملفات
COPY . .

# إنشاء مجلد الصور إذا لم يكن موجود
RUN mkdir -p public/images

# تعيين الصلاحيات
RUN chmod -R 755 public/images

# تعريف المتغيرات
ENV NODE_ENV=production
ENV PORT=3001

# فتح البورت
EXPOSE 3001

# تشغيل التطبيق
CMD ["node", "server.js"] 