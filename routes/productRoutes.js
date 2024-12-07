
const express = require('express');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getProductInventory,
  updateVariants,
} = require('../controllers/productController');


const router = express.Router();

// Create a new product
router.post('/', createProduct);

// Get all products with optional filters
router.get('/', getAllProducts);

// Get a single product by ID
router.get('/:id', getProductById);

// Update a product by ID
router.put('/:id', updateProduct);

// Delete (archive) a product by ID
router.delete('/:id', deleteProduct);

// Add a review to a product
router.post('/:id/reviews', addReview);

// Get inventory details for a product across all warehouses
router.get('/:id/inventory', getProductInventory);

// Get top-selling products
// router.get('/top-selling', getTopSellingProducts);


router.put('/:productId/variants', updateVariants);

module.exports = router;
