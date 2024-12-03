
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
} = require('../controllers/warehouseController');

const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

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
