// controllers/productController.js

const mongoose = require('mongoose');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');
const Sale = require('../modal/Sale');
/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Public (Adjust access as needed)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const productData = req.body;

    // Optional: Validate that variants are provided
    if (!productData.variants || !Array.isArray(productData.variants) || productData.variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required.',
      });
    }

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


exports.updateProductVariants = async (req, res) => {
const { productId } = req.params;
  const { variants } = req.body;

  // Validate request body
  if (!variants || !Array.isArray(variants)) {
    return res.status(400).json({
      message: 'Invalid request: "variants" must be an array.',
    });
  }

  try {
    // Find the product by productId
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({
        message: `Product with productId "${productId}" not found.`,
      });
    }

    // Iterate over each variant in the request
    for (const variantData of variants) {
      const { variantId } = variantData;

      if (variantId) {
        // Check if the variant already exists
        const existingVariant = product.variants.find(
          (v) => v.variantId === variantId
        );

        if (existingVariant) {
          // Update existing variant
          await product.updateVariant(variantId, variantData);
        } else {
          // If variantId does not exist, add as a new variant
          await product.addVariant(variantData);
        }
      } else {
        // If no variantId is provided, generate one or handle accordingly
        // Here, we'll assume variantId is required for adding new variants
        return res.status(400).json({
          message:
            'Each variant must have a "variantId" to add or update.',
        });
      }
    }

    // Save the updated product
    await product.save();

    // Optionally, populate any virtuals or references if needed
    // await product.populate('inventoryItems').execPopulate();

    return res.status(200).json({
      message: 'Variants updated successfully.',
      product,
    });
  } catch (error) {
    console.error('Error updating variants:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(
        (val) => val.message
      );
      return res.status(400).json({ message: messages.join(', ') });
    }

    // Handle duplicate key errors (e.g., unique constraints)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue);
      return res.status(409).json({
        message: `Duplicate value for field: ${field}.`,
      });
    }

    // Generic server error
    return res.status(500).json({
      message: 'Server Error: Unable to update variants.',
    });
  }
};



exports.updateVariants = async (req, res) => {
  const { productId } = req.params;
  const { variants } = req.body;

  try {
    // Find the product by productId
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Iterate over the provided variants
    for (const variantData of variants) {
      const { variantId, ...updatedData } = variantData;

      // Update existing variant
      try {
        await product.updateVariant(variantId, updatedData);
      } catch (error) {
        console.error(`Error updating variant ${variantId}:`, error.message);
        return res.status(400).json({ message: `Error updating variant ${variantId}: ${error.message}` });
      }
    }

    // Save the product after all updates
    await product.save();

    // Optionally, you can populate any necessary fields
    const updatedProduct = await Product.findOne({ productId });

    res.status(200).json({ message: 'Variants updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating variants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};





/**
 * @desc    Get all products with optional filters
 * @route   GET /api/products
 * @access  Public (Adjust access as needed)
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, tag, priceMin, priceMax, search, sku } = req.query;

    // Build query
    const query = { archived: { $ne: true } }; // Exclude archived products

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (sku) {
      // Filter products that have at least one variant with the specified SKU
      query['variants.sku'] = sku;
    }

    if (priceMin || priceMax) {
      query.variants = {
        $elemMatch: {},
      };
      if (priceMin) {
        query.variants.$elemMatch.price = { ...query.variants.$elemMatch.price, $gte: Number(priceMin) };
      }
      if (priceMax) {
        query.variants.$elemMatch.price = { ...query.variants.$elemMatch.price, $lte: Number(priceMax) };
      }
    }

    if (search) {
      // Assuming 'name' is a localized string, adjust the language as needed (e.g., 'en')
      query['name.en'] = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    const products = await Product.find(query)
      .populate({
        path: 'inventoryItems',
        populate: { path: 'warehouse', select: 'warehouseName address' },
      })
      // Removed populate('reviews.user') as 'user' is a string
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

    if (!mongoose.Types.ObjectId.isValid(productId) && !/^[A-Za-z0-9\-]+$/.test(productId)) { 
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    // Assuming productId is a unique string, not the MongoDB _id
    const product = await Product.findOne({ productId: productId, archived: { $ne: true } })
      .populate({
        path: 'inventoryItems',
        populate: { path: 'warehouse', select: 'warehouseName address' },
      })
      // Removed populate('reviews.user') as 'user' is a string
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

    // Validate productId (assuming it's a unique string)
    if (!mongoose.Types.ObjectId.isValid(productId) && !/^[A-Za-z0-9\-]+$/.test(productId)) { 
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    // If variants are being updated, handle them appropriately
    // For example, prevent direct updates to variants array and use instance methods instead
    if (updateData.variants) {
      return res.status(400).json({
        success: false,
        message: 'Use dedicated endpoints to manage product variants.',
      });
    }

    // Update other product fields
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: productId, archived: { $ne: true } },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate({
      path: 'inventoryItems',
      populate: { path: 'warehouse', select: 'warehouseName address' },
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

    // Validate productId (assuming it's a unique string)
    if (!mongoose.Types.ObjectId.isValid(productId) && !/^[A-Za-z0-9\-]+$/.test(productId)) { 
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findOne({ productId: productId, archived: { $ne: true } });

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

    // Validate productId (assuming it's a unique string)
    if (!mongoose.Types.ObjectId.isValid(productId) && !/^[A-Za-z0-9\-]+$/.test(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    // Basic validation for review fields
    if (!user || typeof user !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'User is required and must be a string.',
      });
    }

    if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5.',
      });
    }

    if (comment && comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters.',
      });
    }

    const product = await Product.findOne({ productId: productId, archived: { $ne: true } });

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

    // Validate productId (assuming it's a unique string)
    if (!mongoose.Types.ObjectId.isValid(productId) && !/^[A-Za-z0-9\-]+$/.test(productId)) { 
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    // Find the product first to retrieve all variant SKUs or variantIds
    const product = await Product.findOne({ productId: productId, archived: { $ne: true } }).exec();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Assuming InventoryItem references variants via 'sku'
    const variantSKUs = product.variants.map(variant => variant.sku);

    const inventoryItems = await InventoryItem.find({ sku: { $in: variantSKUs } })
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
      // Lookup to get the productId from the Product model via variant's SKU
      {
        $lookup: {
          from: 'products', // MongoDB collection name is lowercase and plural
          localField: 'sku', // Assuming Sale has 'sku' field referencing Variant's SKU
          foreignField: 'variants.sku',
          as: 'productDetails',
        },
      },
      {
        $unwind: '$productDetails',
      },
      {
        $group: {
          _id: '$productDetails.productId', // Group by productId
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
          localField: '_id',
          foreignField: 'productId',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
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
