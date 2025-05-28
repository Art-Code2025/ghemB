import mongoose from 'mongoose';

// Schema for product specifications
const specificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

// Schema for dynamic product options
const productOptionSchema = new mongoose.Schema({
  optionName: {
    type: String,
    required: true,
    trim: true
  },
  optionType: {
    type: String,
    required: true,
    enum: ['select', 'text', 'number', 'radio']
  },
  required: {
    type: Boolean,
    default: false
  },
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
}, { _id: false });

// Main Product Schema
const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Product description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative'],
    default: null
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  categoryId: {
    type: Number,
    required: [true, 'Category ID is required'],
    ref: 'Category'
  },
  
  // Product Type and Dynamic Fields
  productType: {
    type: String,
    required: true,
    enum: ['وشاح وكاب', 'جاكيت', 'عباية تخرج', 'أطفال', 'كاب فقط'],
    default: 'وشاح وكاب'
  },
  
  // Dynamic options based on product type
  dynamicOptions: [productOptionSchema],
  
  mainImage: {
    type: String,
    trim: true,
    default: ''
  },
  detailedImages: {
    type: [String],
    default: []
  },
  specifications: {
    type: [specificationSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot be more than 60 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot be more than 160 characters']
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
productSchema.index({ id: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ productType: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for category population
productSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: 'id',
  justOne: true
});

// Static method to get default options for each product type
productSchema.statics.getDefaultOptionsForType = function(productType) {
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
        options: []
      },
      {
        optionName: 'capFabric',
        optionType: 'select',
        required: true,
        options: []
      }
    ],
    'جاكيت': [
      {
        optionName: 'size',
        optionType: 'select',
        required: true,
        options: [
          { value: '48', label: '48' },
          { value: '50', label: '50' },
          { value: '52', label: '52' },
          { value: '54', label: '54' },
          { value: '56', label: '56' },
          { value: '58', label: '58' },
          { value: '60', label: '60' }
        ]
      }
    ],
    'عباية تخرج': [
      {
        optionName: 'size',
        optionType: 'select',
        required: true,
        options: [
          { value: '48', label: '48' },
          { value: '50', label: '50' },
          { value: '52', label: '52' },
          { value: '54', label: '54' },
          { value: '56', label: '56' },
          { value: '58', label: '58' },
          { value: '60', label: '60' }
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
        options: []
      }
    ],
    'أطفال': [
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
        options: []
      },
      {
        optionName: 'size',
        optionType: 'select',
        required: true,
        options: []
      },
      {
        optionName: 'color',
        optionType: 'select',
        required: true,
        options: []
      }
    ],
    'كاب فقط': [
      {
        optionName: 'capColor',
        optionType: 'select',
        required: true,
        options: []
      },
      {
        optionName: 'embroideryColor',
        optionType: 'select',
        required: true,
        options: []
      },
      {
        optionName: 'dandoshColor',
        optionType: 'select',
        required: true,
        options: []
      }
    ]
  };
  
  return defaultOptions[productType] || [];
};

// Instance methods
productSchema.methods.isInStock = function() {
  return this.stock > 0;
};

productSchema.methods.reduceStock = function(quantity) {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  return this.save();
};

productSchema.methods.increaseStock = function(quantity) {
  this.stock += quantity;
  return this.save();
};

// Method to get calculated price based on selected options
productSchema.methods.getCalculatedPrice = function(selectedOptions = {}) {
  let totalPrice = this.price;
  
  this.dynamicOptions.forEach(option => {
    const selectedValue = selectedOptions[option.optionName];
    if (selectedValue && option.options) {
      const selectedOption = option.options.find(opt => opt.value === selectedValue);
      if (selectedOption && selectedOption.price) {
        totalPrice += selectedOption.price;
      }
    }
  });
  
  return totalPrice;
};

// Static methods
productSchema.statics.findByCategory = function(categoryId) {
  return this.find({ categoryId, isActive: true }).sort({ createdAt: -1 });
};

productSchema.statics.findByType = function(productType) {
  return this.find({ productType, isActive: true }).sort({ createdAt: -1 });
};

productSchema.statics.findFeatured = function() {
  return this.find({ featured: true, isActive: true }).sort({ createdAt: -1 });
};

productSchema.statics.searchByText = function(searchText) {
  return this.find({
    $text: { $search: searchText },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

productSchema.statics.findLowStock = function(threshold = 5) {
  return this.find({ 
    stock: { $lte: threshold },
    isActive: true 
  }).sort({ stock: 1 });
};

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Auto-generate SEO fields if not provided
  if (!this.seoTitle && this.name) {
    this.seoTitle = this.name.substring(0, 60);
  }
  
  if (!this.seoDescription && this.description) {
    this.seoDescription = this.description.substring(0, 160);
  }
  
  // Set default options if not provided
  if (this.isNew && this.productType && (!this.dynamicOptions || this.dynamicOptions.length === 0)) {
    this.dynamicOptions = this.constructor.getDefaultOptionsForType(this.productType);
  }
  
  next();
});

// Auto-generate unique ID for new products
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastProduct = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastProduct ? lastProduct.id + 1 : 1;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product; 