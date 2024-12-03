
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
