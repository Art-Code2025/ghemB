import mongoose from 'mongoose';
import { config, getMongoUri } from '../config.js';

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('✅ MongoDB already connected');
        return;
      }

      console.log('🔄 Connecting to MongoDB...');
      const mongoUri = getMongoUri();
      console.log(`📍 Connecting to: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

      await mongoose.connect(mongoUri, config.mongodb.options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${config.mongodb.dbName}`);
      
      // Event listeners for connection monitoring
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying connection... (${this.retryCount}/${this.maxRetries})`);
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, this.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.connect();
      } else {
        console.error('💥 Max retries reached. Could not connect to MongoDB');
        throw error;
      }
    }
  }

  setupEventListeners() {
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('👋 MongoDB disconnected');
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

// Export singleton instance
export const dbConnection = new DatabaseConnection(); 