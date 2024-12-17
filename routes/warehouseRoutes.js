
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
  stockIn,
  stockOut,
  adjustStock,
  moveStock,
} = require('../controllers/warehouseController');

const { linkSupplierToWarehouse , getUnlinkedSuppliers } = require('../controllers/SupplierController');

const inventoryController = require('../controllers/inventoryController');

const StockTransaction = require('../modal/StockTransaction'); 

const router = express.Router();

const { body, validationResult } = require('express-validator');

const { getWarehousesInAreaOfInterest,findNearestWarehouseWithProduct } = require('../controllers/nearBywarehouse');




const Warehouse = require('../modal/warehouse');
const InventoryItem = require('../modal/InventoryItem');
const Supplier = require('../modal/Supplier');
const Product = require('../modal/product');

const { haversineDistance } = require('../utils/distance');



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
  body('products.*.variantId').optional().isString().withMessage('variantId must be a string.'),
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
// router.post(
//   '/adjust-stock',
//   validateAdjustStock,
//   async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     adjustStock(req, res, next);
//   }
// );

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
  const { warehouseId, page = 1, limit = 20 } = req.query;
  if (!warehouseId) {
    return res.status(400).json({ message: 'warehouseId query parameter is required' });
  }
  try {
    const transactions = await StockTransaction.find({ warehouseId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('relatedTransaction');
    const total = await StockTransaction.countDocuments({ warehouseId });
    
    res.json({
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});



/**
 * @route   GET /api/warehouses/area-of-interest
 * @desc    Get warehouses within the area of interest based on user's location
 * @access  Public or Protected based on your authentication
 * @queryParams
 *          - lat: Number (required) - User's latitude
 *          - long: Number (required) - User's longitude
 */
router.get('/area-of-interest', async (req, res) => {
  try {
    const { lat, long } = req.query;

    // Input validation
    if (!lat || !long) {
      return res.status(400).json({ message: 'Latitude and Longitude are required.' });
    }

    const userLat = parseFloat(lat);
    const userLong = parseFloat(long);

    if (isNaN(userLat) || isNaN(userLong)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude.' });
    }

    // Get warehouses in the area of interest
    const warehouses = await getWarehousesInAreaOfInterest(userLat, userLong);

    return res.status(200).json({ warehouses });
  } catch (error) {
    console.error('Error in /warehouses/area-of-interest:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



/**
 * @route   POST /api/inventory/fulfillment
 * @desc    Fulfill low stock products by finding nearby warehouses or suppliers
 * @access  Public (Adjust as needed)
 * @body    {
 *             currentWarehouseId: String,
 *             currentCoordinates: { latitude: Number, longitude: Number },
 *             productIds: [String]
 *          }
 */
router.post('/stockfulfillment', async (req, res) => {
  try {
    const { currentWarehouseId, currentCoordinates, productIds } = req.body;

    // Input validation
    if (
      !currentWarehouseId ||
      !currentCoordinates ||
      typeof currentCoordinates.latitude !== 'number' ||
      typeof currentCoordinates.longitude !== 'number' ||
      !Array.isArray(productIds) ||
      productIds.length === 0
    ) {
      return res.status(400).json({ message: 'Invalid input data.' });
    }

    // Fetch the current warehouse details
    const currentWarehouse = await Warehouse.findOne({ warehouseId: currentWarehouseId });
    if (!currentWarehouse) {
      return res.status(404).json({ message: 'Current warehouse not found.' });
    }

    // Initialize the result array
    const results = [];

    // Iterate over each productId
    for (const productId of productIds) {
      // Fetch the inventory item for the current warehouse and productId
      const inventoryItem = await InventoryItem.findOne({
        warehouseId: currentWarehouseId,
        productId: productId,
      });

      if (!inventoryItem) {
        // If inventory item not found, skip or handle as needed
        results.push({
          productId,
          error: 'Inventory item not found in current warehouse.',
        });
        continue;
      }

      const { stockQuantity, reorderLevel } = inventoryItem;

      if (stockQuantity > reorderLevel) {
        // No need to reorder if stock is sufficient
        results.push({
          productId,
          message: 'Stock is above reorder level. No action needed.',
        });
        continue;
      }

      const requiredQuantity = (reorderLevel - stockQuantity) + 10;

      // Step 1: Search for nearby warehouses with sufficient stock
      const nearbyWarehouses = await Warehouse.find({
        warehouseId: { $ne: currentWarehouseId }, // Exclude current warehouse
        'inventoryItems.productId': productId,
      }).populate({
        path: 'inventoryItems',
        match: { productId: productId, stockQuantity: { $gte: requiredQuantity } },
      });

      // Filter warehouses that have at least one inventoryItem with sufficient stock
      const eligibleWarehouses = nearbyWarehouses.filter(
        (wh) => wh.inventoryItems && wh.inventoryItems.length > 0
      );

      if (eligibleWarehouses.length > 0) {
        // Calculate distances
        const warehousesWithDistance = eligibleWarehouses.map((wh) => {
          const [lon, lat] = wh.location.coordinates;
          const distance = haversineDistance(
            currentCoordinates.latitude,
            currentCoordinates.longitude,
            lat,
            lon
          );
          return { warehouse: wh, distance };
        });

        // Sort by distance
        warehousesWithDistance.sort((a, b) => a.distance - b.distance);

        // Assign the nearest warehouse
        const nearestWarehouse = warehousesWithDistance[0].warehouse;
        const distanceInKm = (warehousesWithDistance[0].distance / 1000).toFixed(2);

        results.push({
          productId,
          assignedTo: {
            type: 'warehouse',
            warehouseId: nearestWarehouse.warehouseId,
            message: 'moveOut',
            distance: `${distanceInKm} km`,
          },
        });
        continue; // Proceed to next productId
      }

      // Step 2: If no warehouse found, search for nearby suppliers
      const suppliers = await Supplier.find({
        'productsSupplied.productId': productId,
      });

      if (suppliers.length > 0) {
        // Calculate distances to suppliers
        const suppliersWithDistance = suppliers.map((sup) => {
          if (
            sup.location &&
            sup.location.coordinates &&
            sup.location.coordinates.length === 2
          ) {
            const [lon, lat] = sup.location.coordinates;
            const distance = haversineDistance(
              currentCoordinates.latitude,
              currentCoordinates.longitude,
              lat,
              lon
            );
            return { supplier: sup, distance };
          } else {
            return null; // Invalid location data
          }
        }).filter(item => item !== null);

        if (suppliersWithDistance.length > 0) {
          // Sort suppliers by distance
          suppliersWithDistance.sort((a, b) => a.distance - b.distance);

          // Assign the nearest supplier
          const nearestSupplier = suppliersWithDistance[0].supplier;
          const distanceInKm = (suppliersWithDistance[0].distance / 1000).toFixed(2);

          results.push({
            productId,
            assignedTo: {
              type: 'supplier',
              supplierId: nearestSupplier.supplierId,
              distance: `${distanceInKm} km`,
            },
          });
          continue; // Proceed to next productId
        }
      }

      // If no suppliers found
      results.push({
        productId,
        error: 'No nearby warehouses or suppliers found to fulfill the requirement.',
      });
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Fulfillment Error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});





/**
 * @route   GET /api/warehouses/nearest-warehouse-with-product
 * @desc    Get the nearest warehouse containing a specific product/variant in stock
 * @access  Public or Protected based on your authentication
 * @queryParams
 *          - lat: Number (required) - User's latitude
 *          - long: Number (required) - User's longitude
 *          - productId: String (required) - ID of the product
 *          - variantId: String (optional) - ID of the product variant
 */
router.get('/nearest-warehouse-with-product', async (req, res) => {
  try {
    const { lat, long, productId, variantId } = req.query;

    // Input validation
    if (!lat || !long || !productId) {
      return res.status(400).json({ 
        message: 'Latitude, Longitude, and Product ID are required.' 
      });
    }

    const userLat = parseFloat(lat);
    const userLong = parseFloat(long);

    if (isNaN(userLat) || isNaN(userLong)) {
      return res.status(400).json({ 
        message: 'Invalid latitude or longitude.' 
      });
    }

    // Call the function to find the nearest warehouse with the product
    const nearestWarehouse = await findNearestWarehouseWithProduct(userLat, userLong, productId, variantId);

    if (!nearestWarehouse || !nearestWarehouse.warehouseId) {
      return res.status(404).json({ 
        message: 'No warehouse found with the requested product/variant in stock.' 
      });
    }

    return res.status(200).json(nearestWarehouse);
  } catch (error) {
    console.error('Error in /nearest-warehouse-with-product:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


// Route to get unlinked suppliers for a warehouse
router.get('/:warehouseId/unlinked-suppliers', getUnlinkedSuppliers);

// Route to link a supplier to a warehouse
router.post('/:warehouseId/link-supplier', linkSupplierToWarehouse);



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


router.delete(
  '/:warehouseId/products/:productId/variants/:variantId',
  inventoryController.removeVariantFromWarehouse
);

// List Inventory Items for a Warehouse
router.get('/inventory/products/:warehouseId', inventoryController.listInventoryItems);

// Get All Warehouses with Inventory Items
router.get('/inventory', inventoryController.getAllWarehousesWithInventory);

router.patch('/:warehouseId/adjust', adjustStock);

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
