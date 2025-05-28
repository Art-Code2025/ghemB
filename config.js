// Configuration file for MongoDB and other settings
export const config = {
  // Database Configuration
  mongodb: {
    // MongoDB Atlas URI
    atlasUri: 'mongodb+srv://ghem:ghem@ghem.eqxqd5j.mongodb.net/ghems?retryWrites=true&w=majority&appName=ghem',
    // للاستخدام مع Docker Compose (backup)
    dockerUri: 'mongodb://admin:mawasiem123@mongodb:27017/mawasiem_db?authSource=admin',
    // للاستخدام المحلي (backup)
    localUri: 'mongodb://admin:mawasiem123@localhost:27017/mawasiem_db?authSource=admin',
    dbName: 'ghems',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },

  // Email Configuration
  email: {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'am1322460@gmail.com',
      pass: 'hqww szea ruof uuyy'
    },
    from: {
      name: 'ghem.store',
      address: 'am1322460@gmail.com'
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5,
    tls: {
      rejectUnauthorized: false
    },
    dkim: {
      domainName: 'gmail.com',
      keySelector: 'default',
      privateKey: false
    }
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  }
};

// Helper function to get MongoDB URI based on environment
export const getMongoUri = () => {
  // إذا كان متاح في environment variables
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // إذا كان يعمل في Docker
  if (process.env.NODE_ENV === 'docker' || process.env.DOCKER_ENV) {
    return config.mongodb.dockerUri;
  }
  
  // إذا كان يعمل محلياً
  if (process.env.NODE_ENV === 'local') {
    return config.mongodb.localUri;
  }
  
  // الافتراضي هو MongoDB Atlas
  return config.mongodb.atlasUri;
}; 