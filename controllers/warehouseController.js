// controllers/warehouseController.js

const mongoose = require('mongoose');
const Warehouse = require('../modal/warehouse');
const InventoryItem = require('../modal/InventoryItem');
const Product = require('../modal/product');

/**
 * @desc    Create a new warehouse
 * @route   POST /api/warehouses
 * @access  Public (Adjust access as needed)
 */
exports.createWarehouse = async (req, res, next) => {
  try {
    const {
      warehouseName,
      address,
      contactInfo,
      storageCapacity,
      inventoryManagementSystem,
      temperatureControlled,
    } = req.body;

    const newWarehouse = new Warehouse({
      warehouseName,
      address,
      contactInfo,
      storageCapacity,
      inventoryManagementSystem,
      temperatureControlled,
    });

    const savedWarehouse = await newWarehouse.save();
    res.status(201).json({
      success: true,
      data: savedWarehouse,
    });
  } catch (error) {
    if (error.code === 11000) {
      error.status = 400;
      error.message = 'Warehouse with this name already exists.';
    }
    next(error);
  }
};

/**
 * @desc    Get all warehouses
 * @route   GET /api/warehouses
 * @access  Public (Adjust access as needed)
 */
exports.getAllWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find()
      .populate('linkedSuppliers', 'name contactInfo')
      .populate('linkedCustomers', 'name contactInfo')
      .populate('linkedOrders', 'orderNumber status totalAmount')
      .populate('inventoryItems.product', 'name category price');

    res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single warehouse by ID
 * @route   GET /api/warehouses/:id
 * @access  Public (Adjust access as needed)
 */
exports.getWarehouseById = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('linkedSuppliers', 'name contactInfo')
      .populate('linkedCustomers', 'name contactInfo')
      .populate('linkedOrders', 'orderNumber status totalAmount')
      .populate({
        path: 'inventoryItems',
        populate: { path: 'product', select: 'name category price' },
      })
      .populate('staff', 'name role contactInfo');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a warehouse by ID
 * @route   PUT /api/warehouses/:id
 * @access  Public (Adjust access as needed)
 */
exports.updateWarehouse = async (req, res, next) => {
  try {
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedWarehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedWarehouse,
    });
  } catch (error) {
    if (error.code === 11000) {
      error.status = 400;
      error.message = 'Warehouse with this name already exists.';
    }
    next(error);
  }
};

/**
 * @desc    Soft delete a warehouse by ID
 * @route   DELETE /api/warehouses/:id
 * @access  Public (Adjust access as needed)
 */
exports.deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    warehouse.archived = true;
    await warehouse.save();

    res.status(200).json({
      success: true,
      message: 'Warehouse archived successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add inventory item to a warehouse
 * @route   POST /api/warehouses/:id/inventory
 * @access  Public (Adjust access as needed)
 */
exports.addInventoryItem = async (req, res, next) => {
  try {
    const warehouseId = req.params.id;
    const { productId, stockQuantity, reorderLevel, storageLocation } = req.body;

    // Validate Warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Validate Product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Check if InventoryItem already exists
    let inventoryItem = await InventoryItem.findOne({
      warehouse: warehouseId,
      product: productId,
    });

    if (inventoryItem) {
      return res.status(400).json({
        success: false,
        message: 'Inventory item already exists for this product in the warehouse.',
      });
    }

    // Create new InventoryItem
    inventoryItem = new InventoryItem({
      warehouse: warehouseId,
      product: productId,
      stockQuantity: stockQuantity || 0,
      reorderLevel: reorderLevel || 10,
      storageLocation: storageLocation || {},
    });

    await inventoryItem.save();

    res.status(201).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    if (error.code === 11000) {
      error.status = 400;
      error.message = 'Inventory item already exists for this product in the warehouse.';
    }
    next(error);
  }
};

/**
 * @desc    Update inventory item in a warehouse
 * @route   PUT /api/warehouses/:id/inventory/:inventoryId
 * @access  Public (Adjust access as needed)
 */
exports.updateInventoryItem = async (req, res, next) => {
  try {
    const { id: warehouseId, inventoryId } = req.params;
    const updateData = req.body;

    // Validate Warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Validate InventoryItem
    const inventoryItem = await InventoryItem.findOne({
      _id: inventoryId,
      warehouse: warehouseId,
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found in the specified warehouse.',
      });
    }

    // Update InventoryItem
    Object.assign(inventoryItem, updateData);
    inventoryItem.lastUpdated = Date.now();
    await inventoryItem.save();

    res.status(200).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove (soft delete) inventory item from a warehouse
 * @route   DELETE /api/warehouses/:id/inventory/:inventoryId
 * @access  Public (Adjust access as needed)
 */
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const { id: warehouseId, inventoryId } = req.params;

    // Validate Warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Validate InventoryItem
    const inventoryItem = await InventoryItem.findOne({
      _id: inventoryId,
      warehouse: warehouseId,
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found in the specified warehouse.',
      });
    }

    // Optionally, implement soft delete by adding an 'archived' field
    // For simplicity, we'll delete the inventory item
    await inventoryItem.remove();

    res.status(200).json({
      success: true,
      message: 'Inventory item removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory items for a warehouse with optional filters
 * @route   GET /api/warehouses/:id/inventory
 * @access  Public (Adjust access as needed)
 */
exports.getWarehouseInventory = async (req, res, next) => {
  try {
    const warehouseId = req.params.id;
    const { category, productName } = req.query;

    // Validate Warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Build query
    const query = { warehouse: warehouseId };

    if (category) {
      query['product.category'] = category;
    }

    if (productName) {
      query['product.name.en'] = { $regex: productName, $options: 'i' }; // Case-insensitive search
    }

    const inventoryItems = await InventoryItem.find(query)
      .populate('product', 'name category price')
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
