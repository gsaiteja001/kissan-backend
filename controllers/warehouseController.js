// controllers/warehouseController.js

const mongoose = require('mongoose');
const Warehouse = require('../modal/warehouse');
const InventoryItem = require('../modal/InventoryItem');
const Product = require('../modal/product');

const Supplier = require('../modal/Supplier'); 
const Farmer = require('../modal/farmers');    
const Order = require('../modal/order'); 

const StockTransaction = require('../modal/StockTransaction');

/**
 * @desc    Create a new warehouse with optional staff members
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
      // Determine which field caused the duplicate key error
      const duplicatedField = Object.keys(error.keyPattern)[0];
      if (duplicatedField === 'warehouseName') {
        error.message = 'Warehouse with this name already exists.';
      } else if (duplicatedField === 'staff.employeeId') {
        error.message = 'Duplicate employeeId found in staff members.';
      } else {
        error.message = 'Duplicate key error on field: ' + duplicatedField;
      }
      error.status = 400;
    }
    next(error);
  }
};

/**
 * @desc    Update a staff member in a warehouse
 * @route   PUT /api/warehouses/:id/staff/:staffId
 * @access  Public (Adjust access as needed)
 */
exports.updateStaffMember = async (req, res, next) => {
  try {
    const { id: warehouseId, staffId } = req.params;
    const updateData = req.body;

    // Validate Warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Find the staff member
    const staffMember = warehouse.staff.id(staffId);
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found in the specified warehouse.',
      });
    }

    // If updating employeeId, check for duplicates
    if (updateData.employeeId && updateData.employeeId !== staffMember.employeeId) {
      const duplicate = warehouse.staff.find(member => member.employeeId === updateData.employeeId);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Another staff member with this employeeId already exists in the warehouse.',
        });
      }
    }

    // Update staff member details
    staffMember.set(updateData);
    await warehouse.save();

    res.status(200).json({
      success: true,
      data: staffMember,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern['staff.employeeId']) {
      error.message = 'Duplicate employeeId found in staff members.';
      error.status = 400;
    }
    next(error);
  }
};


/**
 * @desc    Add a staff member to a warehouse using atomic operation
 * @route   POST /api/warehouses/:id/staff
 * @access  Public (Adjust access as needed)
 */
exports.addStaffMemberAtomic = async (req, res, next) => {
  try {
    const warehouseId = req.params.id;
    const { employeeId, name, role, contactInfo } = req.body;

    const updatedWarehouse = await Warehouse.findOneAndUpdate(
      { _id: warehouseId, 'staff.employeeId': { $ne: employeeId } }, // Ensure no duplicate
      { 
        $push: { 
          staff: { employeeId, name, role, contactInfo } 
        } 
      },
      { new: true }
    );

    if (!updatedWarehouse) {
      return res.status(400).json({
        success: false,
        message: 'A staff member with this employeeId already exists in the warehouse.',
      });
    }

    res.status(201).json({
      success: true,
      data: updatedWarehouse.staff.find(member => member.employeeId === employeeId),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern['staff.employeeId']) {
      error.message = 'Duplicate employeeId found in staff members.';
      error.status = 400;
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
      // .populate('linkedOrders', 'orderNumber status totalAmount')
      .populate({
        path: 'inventoryItems',
        populate: {
          path: 'product',
          select: 'name category price',
        },
      });

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
    const { id } = req.params; // Changed from warehouseId to id
    const warehouse = await Warehouse.findOne({ warehouseId: id })
      .populate('linkedSuppliers', 'name contactInfo')
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

// Helper function to perform deep merge of objects
function mergeDeep(target, source) {
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  for (const key in source) {
    if (source[key] instanceof Date) {
      target[key] = source[key];
    } else if (source[key] && typeof source[key] === 'object') {
      target[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

exports.updateWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params; // warehouseId

    // Find the warehouse by warehouseId
    let warehouse = await Warehouse.findOne({ warehouseId: id });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    const updateFields = req.body;

    // Iterate through updateFields to update the warehouse document
    for (let key in updateFields) {
      if (Array.isArray(updateFields[key])) {
        // Handle array fields
        if (['staff', 'maintenanceSchedule', 'complianceCertificates'].includes(key)) {
          // For arrays of embedded documents, replace the entire array
          warehouse[key] = updateFields[key];
        } else if (key === 'linkedSuppliers') {
          warehouse[key] = updateFields[key].map((supplierId) => {
            if (!mongoose.Types.ObjectId.isValid(supplierId)) {
              throw new Error(`Invalid Supplier ID: ${supplierId}`);
            }
            return supplierId;
          });
        } else {
          // For any other array fields, replace the entire array
          warehouse[key] = updateFields[key];
        }
      } else if (typeof updateFields[key] === 'object' && updateFields[key] !== null) {
        // For nested objects, perform a deep merge to update only provided fields
        warehouse[key] = mergeDeep(warehouse[key], updateFields[key]);
      } else {
        // For simple scalar fields, directly assign the new value
        warehouse[key] = updateFields[key];
      }
    }

    await warehouse.save();

    // Populate necessary fields before sending the response
    // Only populate referenced fields (linkedSuppliers)
    await warehouse.populate('linkedSuppliers', 'name contactInfo');

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error(error);
    // Handle validation errors separately if needed
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
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
    const { warehouseId } = req.params;
    const { productId, stockQuantity, reorderLevel, storageLocation } = req.body;

    // Validate Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId });
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Validate Product
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Check if InventoryItem already exists
    let inventoryItem = await InventoryItem.findOne({
      warehouse: warehouse._id,
      product: product._id,
    });

    if (inventoryItem) {
      return res.status(400).json({
        success: false,
        message: 'Inventory item already exists for this product in the warehouse.',
      });
    }

    // Create new InventoryItem
    inventoryItem = new InventoryItem({
      warehouse: warehouse._id,
      product: product._id,
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
 * Stock In function
 * Adds stock to specific products in a warehouse and links to a Purchase
 */
exports.stockIn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { warehouseId, products, performedBy, notes, purchaseId } = req.body;

    // Validate input
    if (!warehouseId || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'warehouseId and at least one product are required.' });
    }

    // Find the Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    let purchase = null;
    if (purchaseId) {
      purchase = await Purchase.findOne({ purchaseId }).session(session);
      if (!purchase) {
        throw new Error('Purchase not found.');
      }
    }

    // Iterate over each product in the transaction
    for (const prod of products) {
      const { productId, quantity, unit } = prod;

      if (!productId || quantity === undefined) {
        throw new Error('Each product must have a productId and quantity.');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero.');
      }

      // Find the Product
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Find or Create the InventoryItem
      let inventoryItem = await InventoryItem.findOne({ warehouseId, productId }).session(session);
      if (!inventoryItem) {
        inventoryItem = new InventoryItem({ warehouseId, productId, stockQuantity: 0, reorderLevel: 10 });
      }

      // Update the InventoryItem
      inventoryItem.stockQuantity += quantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save({ session });

      // Update the Product's total stock
      await product.updateTotalStock();
    }

    // Create a StockTransaction for Stock In
    const stockInTransaction = new StockTransaction({
      transactionType: 'stockIn',
      warehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: prod.unit || 'kg',
      })),
      performedBy: performedBy || 'System', // Replace with actual user if available
      notes: notes || '',
      relatedTransactionType: purchaseId ? 'Purchase' : undefined,
      relatedTransaction: purchaseId ? purchase._id : undefined,
    });
    await stockInTransaction.save({ session });

    // Link StockTransaction to Purchase if applicable
    if (purchase) {
      purchase.stockTransaction = stockInTransaction._id;
      await purchase.save({ session });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Stock added successfully.',
      stockTransaction: {
        _id: stockInTransaction._id,
        transactionId: stockInTransaction.transactionId,
        transactionType: stockInTransaction.transactionType,
        warehouseId: stockInTransaction.warehouseId,
        products: stockInTransaction.products,
        performedBy: stockInTransaction.performedBy,
        notes: stockInTransaction.notes,
        relatedTransactionType: stockInTransaction.relatedTransactionType,
        relatedTransaction: stockInTransaction.relatedTransaction,
        timestamp: stockInTransaction.timestamp,
      },
    });
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in stockIn:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Stock Out function
 * Removes stock from specific products in a warehouse and links to a SalesTransaction
 */
exports.stockOut = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { warehouseId, products, performedBy, notes, salesTransactionId } = req.body;

    // Validate input
    if (!warehouseId || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'warehouseId and at least one product are required.' });
    }

    // Find the Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    let salesTransaction = null;
    if (salesTransactionId) {
      salesTransaction = await SalesTransaction.findOne({ salesTransactionId }).session(session);
      if (!salesTransaction) {
        throw new Error('SalesTransaction not found.');
      }
    }

    // Iterate over each product in the transaction
    for (const prod of products) {
      const { productId, quantity, unit } = prod;

      if (!productId || quantity === undefined) {
        throw new Error('Each product must have a productId and quantity.');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero.');
      }

      // Find the Product
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Find the InventoryItem
      let inventoryItem = await InventoryItem.findOne({ warehouseId, productId }).session(session);
      if (!inventoryItem) {
        throw new Error(`Inventory item for productId ${productId} not found in warehouse ${warehouseId}.`);
      }

      // Check if sufficient stock exists
      if (inventoryItem.stockQuantity < quantity) {
        throw new Error(`Insufficient stock for productId ${productId}. Available: ${inventoryItem.stockQuantity}, Requested: ${quantity}`);
      }

      // Update the InventoryItem
      inventoryItem.stockQuantity -= quantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save({ session });

      // Update the Product's total stock
      await product.updateTotalStock();
    }

    // Create a StockTransaction for Stock Out
    const stockOutTransaction = new StockTransaction({
      transactionType: 'stockOut',
      warehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: prod.unit || 'kg',
      })),
      performedBy: performedBy || 'System',
      notes: notes || '',
      relatedTransactionType: salesTransactionId ? 'SalesTransaction' : undefined,
      relatedTransaction: salesTransactionId ? salesTransaction._id : undefined,
    });
    await stockOutTransaction.save({ session });

    // Link StockTransaction to SalesTransaction if applicable
    if (salesTransaction) {
      salesTransaction.stockTransaction = stockOutTransaction._id;
      await salesTransaction.save({ session });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Stock removed successfully.',
      stockTransaction: {
        _id: stockOutTransaction._id,
        transactionId: stockOutTransaction.transactionId,
        transactionType: stockOutTransaction.transactionType,
        warehouseId: stockOutTransaction.warehouseId,
        products: stockOutTransaction.products,
        performedBy: stockOutTransaction.performedBy,
        notes: stockOutTransaction.notes,
        relatedTransactionType: stockOutTransaction.relatedTransactionType,
        relatedTransaction: stockOutTransaction.relatedTransaction,
        timestamp: stockOutTransaction.timestamp,
      },
    });
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in stockOut:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Adjust Stock function
 * Adjusts the stock quantity for specific products in a warehouse to new specified values.
 */
exports.adjustStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { warehouseId, products, performedBy, notes } = req.body;

    // Input Validation
    if (!warehouseId || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'warehouseId and at least one product are required.' });
    }

    // Find the Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    // Iterate over each product to adjust stock
    for (const prod of products) {
      const { productId, newQuantity, unit } = prod;

      if (productId === undefined || newQuantity === undefined) {
        throw new Error('Each product must have a productId and newQuantity.');
      }

      // Find the Product
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Find the InventoryItem
      let inventoryItem = await InventoryItem.findOne({ warehouseId, productId }).session(session);
      if (!inventoryItem) {
        // If InventoryItem does not exist, create it
        inventoryItem = new InventoryItem({ warehouseId, productId, stockQuantity: 0, reorderLevel: 10 });
      }

      const currentQuantity = inventoryItem.stockQuantity;
      const adjustment = newQuantity - currentQuantity;

      if (adjustment === 0) {
        // No adjustment needed
        continue;
      }

      // Update the InventoryItem
      inventoryItem.stockQuantity = newQuantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save({ session });

      // Update the Product's total stock
      await product.updateTotalStock();

      // Determine Transaction Type
      const transactionType = adjustment > 0 ? 'stockIn' : 'stockOut';
      const transactionQuantity = Math.abs(adjustment);

      // Create a StockTransaction
      const stockTransaction = new StockTransaction({
        transactionType,
        warehouseId,
        products: [{
          productId,
          quantity: transactionQuantity,
          unit: unit || 'kg',
        }],
        performedBy: performedBy || 'System', // Replace with actual user identifier if available
        notes: notes || `Stock adjusted to ${newQuantity} units.`,
      });

      await stockTransaction.save({ session });
    }

    // Commit the Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Stock adjusted successfully.',
    });

  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in adjustStock:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Move Stock function
 * Transfers stock of specific products from one warehouse to another.
 */
exports.moveStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      sourceWarehouseId,
      destinationWarehouseId,
      products,
      performedBy,
      notes,
    } = req.body;

    // Input Validation
    if (
      !sourceWarehouseId ||
      !destinationWarehouseId ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        error:
          'sourceWarehouseId, destinationWarehouseId, and at least one product are required.',
      });
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      return res
        .status(400)
        .json({ error: 'Source and destination warehouses must be different.' });
    }

    // Find Source Warehouse
    const sourceWarehouse = await Warehouse.findOne({
      warehouseId: sourceWarehouseId,
    }).session(session);
    if (!sourceWarehouse) {
      throw new Error('Source warehouse not found.');
    }

    // Find Destination Warehouse
    const destinationWarehouse = await Warehouse.findOne({
      warehouseId: destinationWarehouseId,
    }).session(session);
    if (!destinationWarehouse) {
      throw new Error('Destination warehouse not found.');
    }

    // Iterate Over Each Product to Move Stock
    for (const prod of products) {
      const { productId, quantity, unit } = prod;

      if (productId === undefined || quantity === undefined) {
        throw new Error(
          'Each product must have a productId and quantity to move.'
        );
      }

      if (quantity <= 0) {
        throw new Error('Quantity to move must be greater than zero.');
      }

      // Find the Product
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Find the InventoryItem in Source Warehouse
      const sourceInventoryItem = await InventoryItem.findOne({
        warehouseId: sourceWarehouseId,
        productId,
      }).session(session);
      if (!sourceInventoryItem) {
        throw new Error(
          `Inventory item for productId ${productId} not found in source warehouse.`
        );
      }

      // Check Sufficient Stock in Source Warehouse
      if (sourceInventoryItem.stockQuantity < quantity) {
        throw new Error(
          `Insufficient stock for productId ${productId} in source warehouse. Available: ${sourceInventoryItem.stockQuantity}, Requested: ${quantity}`
        );
      }

      // Find or Create InventoryItem in Destination Warehouse
      let destinationInventoryItem = await InventoryItem.findOne({
        warehouseId: destinationWarehouseId,
        productId,
      }).session(session);
      if (!destinationInventoryItem) {
        destinationInventoryItem = new InventoryItem({
          warehouseId: destinationWarehouseId,
          productId,
          stockQuantity: 0,
          reorderLevel: 10,
        });
      }

      // Update Source InventoryItem
      sourceInventoryItem.stockQuantity -= quantity;
      sourceInventoryItem.lastUpdated = new Date();
      await sourceInventoryItem.save({ session });

      // Update Destination InventoryItem
      destinationInventoryItem.stockQuantity += quantity;
      destinationInventoryItem.lastUpdated = new Date();
      await destinationInventoryItem.save({ session });

      // Update Products' Total Stock (if necessary)
      await product.updateTotalStock();
    }

    // Create StockTransaction for Stock Out (Source Warehouse)
    const stockOutTransaction = new StockTransaction({
      transactionType: 'moveStock',
      warehouseId: sourceWarehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: prod.unit || 'kg',
      })),
      performedBy: performedBy || 'System', // Replace with actual user identifier if available
      notes:
        notes ||
        `Moved ${products
          .map((p) => `${p.quantity} ${p.unit || 'kg'} of ${p.productId}`)
          .join(', ')} to warehouse ${destinationWarehouseId}.`,
    });
    await stockOutTransaction.save({ session });

    // Create StockTransaction for Stock In (Destination Warehouse)
    const stockInTransaction = new StockTransaction({
      transactionType: 'moveStock',
      warehouseId: destinationWarehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: prod.unit || 'kg',
      })),
      performedBy: performedBy || 'System',
      notes:
        notes ||
        `Received ${products
          .map((p) => `${p.quantity} ${p.unit || 'kg'} of ${p.productId}`)
          .join(', ')} from warehouse ${sourceWarehouseId}.`,
      relatedTransactionType: 'StockTransaction', // Specifies that relatedTransaction refers to a StockTransaction
      relatedTransaction: stockOutTransaction._id, // Reference to the stockOutTransaction's _id
    });
    await stockInTransaction.save({ session });

    // Commit the Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Stock moved successfully.',
      stockOutTransaction: {
        _id: stockOutTransaction._id,
        transactionId: stockOutTransaction.transactionId,
        // ... other fields ...
      },
      stockInTransaction: {
        _id: stockInTransaction._id,
        transactionId: stockInTransaction.transactionId,
        // ... other fields ...
      },
    });
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in moveStock:', error);
    res.status(500).json({ error: error.message });
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
    const { warehouseId } = req.params;
    const { category, productName } = req.query;

    // Validate Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId });
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      });
    }

    // Build query
    const query = { warehouse: warehouse._id };

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

//------------------------------------------------------------- suppliers ---------------------------------------------------------------------------


/**
 * Link a supplier to a warehouse
 * @param {String} warehouseId - The unique identifier of the warehouse
 * @param {String} supplierId - The unique identifier of the supplier
 * @returns {Object} - Updated warehouse document
 */
exports.linkSupplierToWarehouse = async (warehouseId, supplierId) => {
  try {
    // Find the warehouse by warehouseId
    const warehouse = await Warehouse.findOne({ warehouseId });
    if (!warehouse) {
      throw new Error(`Warehouse with warehouseId ${warehouseId} not found.`);
    }

    // Find the supplier by supplierId
    const supplier = await Supplier.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }

    // Avoid duplicate entries
    if (!warehouse.linkedSuppliers.includes(supplier._id)) {
      warehouse.linkedSuppliers.push(supplier._id);
      await warehouse.save();
    }

    return warehouse;
  } catch (error) {
    throw new Error(`Error linking supplier to warehouse: ${error.message}`);
  }
};

