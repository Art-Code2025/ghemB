import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbConnection } from '../database/connection.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add this to make sure console.log works properly
process.stdout.write('🚀 Starting data migration from JSON to MongoDB...\n');
process.stdout.write('='.repeat(60) + '\n');

class DataMigrator {
  constructor() {
    this.migrationLog = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    
    this.migrationLog.push(logEntry);
    console.log(logEntry);
    
    if (type === 'error') {
      this.errors.push(logEntry);
    }
  }

  async readJsonFile(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.log(`Error reading file ${filePath}: ${error.message}`, 'error');
      return [];
    }
  }

  async backupCurrentData() {
    this.log('🔄 Creating backup of current MongoDB data...');
    
    try {
      const backupDir = path.join(__dirname, '..', 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
      
      const backup = {
        timestamp: new Date(),
        products: await Product.find({}),
        categories: await Category.find({})
      };
      
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
      this.log(`✅ Backup created: ${backupFile}`);
      
    } catch (error) {
      this.log(`Error creating backup: ${error.message}`, 'error');
    }
  }

  async migrateCategories() {
    this.log('🔄 Migrating categories...');
    
    try {
      const categoriesData = await this.readJsonFile('categories.json');
      
      if (categoriesData.length === 0) {
        this.log('⚠️  No categories found in JSON file');
        return;
      }
      
      // Clear existing categories
      const deletedCount = await Category.deleteMany({});
      this.log(`🗑️  Cleared ${deletedCount.deletedCount} existing categories`);
      
      let successCount = 0;
      
      for (const categoryData of categoriesData) {
        try {
          const category = new Category({
            id: categoryData.id,
            name: categoryData.name,
            description: categoryData.description || '',
            image: categoryData.image || '',
            createdAt: categoryData.createdAt ? new Date(categoryData.createdAt) : new Date(),
            isActive: true
          });
          
          await category.save();
          successCount++;
          this.log(`✅ Migrated category: ${categoryData.name}`);
          
        } catch (error) {
          this.log(`Error migrating category ${categoryData.id}: ${error.message}`, 'error');
        }
      }
      
      this.log(`✅ Successfully migrated ${successCount}/${categoriesData.length} categories`);
      
    } catch (error) {
      this.log(`Error in category migration: ${error.message}`, 'error');
    }
  }

  async migrateProducts() {
    this.log('🔄 Migrating products...');
    
    try {
      const productsData = await this.readJsonFile('products.json');
      
      if (productsData.length === 0) {
        this.log('⚠️  No products found in JSON file');
        return;
      }
      
      // Clear existing products
      const deletedCount = await Product.deleteMany({});
      this.log(`🗑️  Cleared ${deletedCount.deletedCount} existing products`);
      
      let successCount = 0;
      
      for (const productData of productsData) {
        try {
          const product = new Product({
            id: productData.id,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            stock: productData.stock || 0,
            categoryId: productData.categoryId,
            mainImage: productData.mainImage || '',
            detailedImages: productData.detailedImages || [],
            specifications: productData.specifications || [],
            createdAt: productData.createdAt ? new Date(productData.createdAt) : new Date(),
            isActive: true,
            featured: false
          });
          
          await product.save();
          successCount++;
          this.log(`✅ Migrated product: ${productData.name}`);
          
        } catch (error) {
          this.log(`Error migrating product ${productData.id}: ${error.message}`, 'error');
        }
      }
      
      this.log(`✅ Successfully migrated ${successCount}/${productsData.length} products`);
      
    } catch (error) {
      this.log(`Error in product migration: ${error.message}`, 'error');
    }
  }

  async validateMigration() {
    this.log('🔍 Validating migration...');
    
    try {
      const categoriesCount = await Category.countDocuments();
      const productsCount = await Product.countDocuments();
      
      // Read original JSON files for comparison
      const originalCategories = await this.readJsonFile('categories.json');
      const originalProducts = await this.readJsonFile('products.json');
      
      this.log(`📊 Migration Summary:`);
      this.log(`   Categories: ${categoriesCount}/${originalCategories.length} migrated`);
      this.log(`   Products: ${productsCount}/${originalProducts.length} migrated`);
      
      // Check for any orphaned products (products without categories)
      const orphanedProducts = await Product.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: 'id',
            as: 'category'
          }
        },
        {
          $match: {
            category: { $size: 0 }
          }
        }
      ]);
      
      if (orphanedProducts.length > 0) {
        this.log(`⚠️  Found ${orphanedProducts.length} orphaned products (no matching category)`, 'error');
        orphanedProducts.forEach(product => {
          this.log(`   - Product ID ${product.id}: ${product.name}`, 'error');
        });
      } else {
        this.log('✅ All products have valid categories');
      }
      
    } catch (error) {
      this.log(`Error in validation: ${error.message}`, 'error');
    }
  }

  async saveMigrationLog() {
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logDir, `migration-${timestamp}.log`);
      
      const logContent = this.migrationLog.join('\n');
      await fs.writeFile(logFile, logContent);
      
      this.log(`📝 Migration log saved: ${logFile}`);
      
    } catch (error) {
      console.error('Error saving migration log:', error.message);
    }
  }

  async run() {
    try {
      // Connect to MongoDB
      await dbConnection.connect();
      
      // Create backup
      await this.backupCurrentData();
      
      // Migrate categories first (products depend on them)
      await this.migrateCategories();
      
      // Migrate products
      await this.migrateProducts();
      
      // Validate migration
      await this.validateMigration();
      
      // Save migration log
      await this.saveMigrationLog();
      
      console.log('='.repeat(60));
      console.log('🎉 Migration completed!');
      
      if (this.errors.length > 0) {
        console.log(`⚠️  ${this.errors.length} errors occurred during migration:`);
        this.errors.forEach(error => console.log(error));
      } else {
        console.log('✅ Migration completed without errors!');
      }
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      await dbConnection.disconnect();
    }
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new DataMigrator();
  migrator.run().catch(console.error);
}

export { DataMigrator }; 