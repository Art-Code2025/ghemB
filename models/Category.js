import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Category description cannot be more than 500 characters']
  },
  image: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parentId: {
    type: Number,
    ref: 'Category',
    default: null
  },
  order: {
    type: Number,
    default: 0
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

// Indexes
categorySchema.index({ id: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ order: 1 });

// Virtual for products count
categorySchema.virtual('productsCount', {
  ref: 'Product',
  localField: 'id',
  foreignField: 'categoryId',
  count: true,
  match: { isActive: true }
});

// Virtual for parent category
categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: 'id',
  justOne: true
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: 'id',
  foreignField: 'parentId'
});

// Static methods
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

categorySchema.statics.findMainCategories = function() {
  return this.find({ 
    isActive: true, 
    $or: [{ parentId: null }, { parentId: { $exists: false } }]
  }).sort({ order: 1, name: 1 });
};

categorySchema.statics.findSubcategories = function(parentId) {
  return this.find({ parentId, isActive: true }).sort({ order: 1, name: 1 });
};

// Auto-generate unique ID for new categories
categorySchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    const lastCategory = await this.constructor.findOne().sort({ id: -1 });
    this.id = lastCategory ? lastCategory.id + 1 : 1;
  }
  
  // Auto-generate SEO fields if not provided
  if (!this.seoTitle && this.name) {
    this.seoTitle = this.name.substring(0, 60);
  }
  
  if (!this.seoDescription && this.description) {
    this.seoDescription = this.description.substring(0, 160);
  }
  
  next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category; 