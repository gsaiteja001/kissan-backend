// controllers/productController.js

const mongoose = require('mongoose');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Public (Adjust access as needed)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const productData = req.body;

    const newProduct = new Product(productData);

    const savedProduct = await newProduct.save();
    res.status(201).json({
      success: true,
      data: savedProduct,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      error.status = 400;
      error.message = `Product with this ${field} already exists.`;
    }
    next(error);
  }
};

/**
 * @desc    Get all products with optional filters
 * @route   GET /api/products
 * @access  Public (Adjust access as needed)
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, tag, priceMin, priceMax, search } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = Number(priceMin);
      if (priceMax) query.price.$lte = Number(priceMax);
    }

    if (search) {
      query['name.en'] = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    const products = await Product.find(query)
      .populate('reviews.user') // Assuming 'user' is a reference; adjust if it's just a string
      .populate('inventoryItems.warehouse', 'warehouseName address')
      .exec();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single product by ID
 * @route   GET /api/products/:id
 * @access  Public (Adjust access as needed)
 */
exports.getProductById = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findById(productId)
      .populate({
        path: 'inventoryItems',
        populate: { path: 'warehouse', select: 'warehouseName address' },
      })
      .populate('reviews.user') // Assuming 'user' is a reference; adjust if it's just a string
      .exec();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a product by ID
 * @route   PUT /api/products/:id
 * @access  Public (Adjust access as needed)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      error.status = 400;
      error.message = `Product with this ${field} already exists.`;
    }
    next(error);
  }
};

/**
 * @desc    Delete (soft delete) a product by ID
 * @route   DELETE /api/products/:id
 * @access  Public (Adjust access as needed)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Soft delete by setting 'archived' to true
    product.archived = true;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product archived successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a review to a product
 * @route   POST /api/products/:id/reviews
 * @access  Public (Adjust access as needed)
 */
exports.addReview = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { user, rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const newReview = {
      user,
      rating,
      comment,
    };

    product.reviews.push(newReview);
    await product.save();

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory details for a product across all warehouses
 * @route   GET /api/products/:id/inventory
 * @access  Public (Adjust access as needed)
 */
exports.getProductInventory = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const inventoryItems = await InventoryItem.find({ product: productId })
      .populate('warehouse', 'warehouseName address')
      .exec();

    res.status(200).json({
      success: true,
      count: inventoryItems.length,
      data: inventoryItems,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get top-selling products across all warehouses
 * @route   GET /api/products/top-selling
 * @access  Public (Adjust access as needed)
 */
exports.getTopSellingProducts = async (req, res, next) => {
  try {
    const { top = 5 } = req.query;

    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: {
            product: '$product',
          },
          totalQuantitySold: { $sum: '$quantitySold' },
        },
      },
      {
        $sort: { totalQuantitySold: -1 },
      },
      {
        $limit: parseInt(top),
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          productId: '$product.productId',
          name: '$product.name.en',
          category: '$product.category',
          totalQuantitySold: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: salesData.length,
      data: salesData,
    });
  } catch (error) {
    next(error);
  }
};
