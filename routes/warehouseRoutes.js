
const express = require('express');
const {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getWarehouseInventory,
  linkSupplierToWarehouse,
  stockIn,
  stockOut,
  adjustStock,
  moveStock,
} = require('../controllers/warehouseController');

const inventoryController = require('../controllers/inventoryController');

const StockTransaction = require('../modal/StockTransaction'); 

const router = express.Router();

const { body, validationResult } = require('express-validator');

// Middleware for validating stock transaction inputs
const validateAdjustStock = [
  body('warehouseId').notEmpty().withMessage('warehouseId is required.'),
  body('products').isArray({ min: 1 }).withMessage('At least one product must be provided.'),
  body('products.*.productId').notEmpty().withMessage('productId is required for each product.'),
  body('products.*.newQuantity').isFloat({ min: 0 }).withMessage('newQuantity must be a non-negative number for each product.'),
];

const validateMoveStock = [
  body('sourceWarehouseId').notEmpty().withMessage('sourceWarehouseId is required.'),
  body('destinationWarehouseId').notEmpty().withMessage('destinationWarehouseId is required.'),
  body('products').isArray({ min: 1 }).withMessage('At least one product must be provided.'),
  body('products.*.productId').notEmpty().withMessage('productId is required for each product.'),
  body('products.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0 for each product.'),
  // Add more validations as needed
];

// Middleware for validating stockIn transaction inputs
const validateStockIn = [
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId is required.')
    .isString()
    .withMessage('warehouseId must be a string.'),
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product must be provided.'),
  body('products.*.productId')
    .notEmpty()
    .withMessage('productId is required for each product.')
    .isString()
    .withMessage('productId must be a string.'),
  body('products.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('quantity must be greater than 0 for each product.'),
  body('products.*.unit')
    .optional()
    .isString()
    .withMessage('unit must be a string if provided.'),
];

// Middleware for validating stockOut transaction inputs
const validateStockOut = [
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId is required.')
    .isString()
    .withMessage('warehouseId must be a string.'),
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product must be provided.'),
  body('products.*.productId')
    .notEmpty()
    .withMessage('productId is required for each product.')
    .isString()
    .withMessage('productId must be a string.'),
  body('products.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('quantity must be greater than 0 for each product.'),
  body('products.*.unit')
    .optional()
    .isString()
    .withMessage('unit must be a string if provided.'),
];

// Adjust Stock Route
router.post(
  '/adjust-stock',
  validateAdjustStock,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    adjustStock(req, res, next);
  }
);

// Move Stock Route
router.post(
  '/move-stock',
  validateMoveStock,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    moveStock(req, res, next);
  }
);


// **New Route: Stock In**
// Handles adding stock to products in a warehouse
router.post(
  '/stock-in',
  validateStockIn,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    stockIn(req, res, next);
  }
);

// **New Route: Stock Out**
// Handles removing stock from products in a warehouse
router.post(
  '/stock-out',
  validateStockOut,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    stockOut(req, res, next);
  }
);



router.get('/transactions', async (req, res) => {
  const { warehouseId } = req.query;

  // Validate that warehouseId is provided
  if (!warehouseId) {
    return res.status(400).json({ message: 'warehouseId query parameter is required' });
  }

  try {
    // Fetch transactions matching the warehouseId
    const transactions = await StockTransaction.find({ warehouseId })
      .sort({ timestamp: -1 })
      .populate('relatedTransaction'); 

    // If no transactions found, return a 404
    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No transactions found for the provided warehouseId' });
    }

    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});



// Create a new warehouse
router.post('/create', createWarehouse);

// Get all warehouses
router.get('/all-warehouses', getAllWarehouses);

// Get a single warehouse by ID
router.get('/:id', getWarehouseById);

// Update a warehouse by ID
router.put('/:id', updateWarehouse);

// Delete (archive) a warehouse by ID
router.delete('/:id', deleteWarehouse);

// Add inventory item to a warehouse
router.post('/:id/inventory', addInventoryItem);

// Update inventory item in a warehouse
router.put('/:id/inventory/:inventoryId', updateInventoryItem);

// Delete inventory item from a warehouse
router.delete('/:id/inventory/:inventoryId', deleteInventoryItem);

// Get inventory items for a warehouse
router.get('/:id/inventory', getWarehouseInventory);


// Add Product to Warehouse
router.post('/:warehouseId/products', inventoryController.addProductToWarehouse);

// Remove Product from Warehouse
router.delete('/:warehouseId/products/:productId', inventoryController.removeProductFromWarehouse);

// List Inventory Items for a Warehouse
router.get('/inventory/products/:warehouseId', inventoryController.listInventoryItems);

// Get All Warehouses with Inventory Items
router.get('/inventory', inventoryController.getAllWarehousesWithInventory);

router.patch('/:warehouseId/inventory/:inventoryId/adjust', inventoryController.adjustStock);

router.post('/products/multiple/:warehouseId', inventoryController.addMultipleProductsToWarehouse);




/**
 * @route   POST /warehouses/:warehouseId/link-supplier/:supplierId
 * @desc    Link a supplier to a warehouse
 * @access  Public (Update as per your authentication strategy)
 */
router.post('/:warehouseId/link-supplier/:supplierId', async (req, res) => {
  try {
    const warehouse = await linkSupplierToWarehouse(
      req.params.warehouseId,
      req.params.supplierId
    );
    res.status(200).json({ message: 'Supplier linked to warehouse successfully.', warehouse });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;
