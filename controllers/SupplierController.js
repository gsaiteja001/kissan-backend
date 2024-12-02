const Supplier = require('../modal/Supplier');
const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');

/**
 * Add a new supplier
 * @param {Object} supplierData - Data for the new supplier
 * @returns {Object} - Created supplier document
 */
const addSupplier = async (supplierData) => {
  try {
    const supplier = new Supplier(supplierData);
    await supplier.save();
    return supplier;
  } catch (error) {
    throw new Error(`Error adding supplier: ${error.message}`);
  }
};

/**
 * Delete a supplier by supplierId
 * @param {String} supplierId - The unique identifier of the supplier
 * @returns {Object} - Deleted supplier document
 */
const deleteSupplier = async (supplierId) => {
  try {
    const supplier = await Supplier.findOneAndDelete({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }
    // Optionally, remove the supplier from all warehouses
    await Warehouse.updateMany(
      { linkedSuppliers: supplier._id },
      { $pull: { linkedSuppliers: supplier._id } }
    );
    return supplier;
  } catch (error) {
    throw new Error(`Error deleting supplier: ${error.message}`);
  }
};

/**
 * Update an existing supplier by supplierId
 * @param {String} supplierId - The unique identifier of the supplier
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated supplier document
 */
const updateSupplier = async (supplierId, updateData) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }
    return supplier;
  } catch (error) {
    throw new Error(`Error updating supplier: ${error.message}`);
  }
};

/**
 * Add products to a supplier's productsSupplied using supplierId
 * Can handle single or multiple products
 * @param {String} supplierId - The unique identifier of the supplier
 * @param {Array|Object} products - Single product object or array of product objects
 * @returns {Object} - Updated supplier document
 */
const addProductToSupplier = async (supplierId, products) => {
  try {
    const supplier = await Supplier.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }

    // Ensure products is an array
    const productsArray = Array.isArray(products) ? products : [products];

    for (const product of productsArray) {
      const { productId, suppliedQuantity, leadTime } = product;

      // Validate required fields
      if (!productId || suppliedQuantity == null || !leadTime) {
        throw new Error('Each product must have productId, suppliedQuantity, and leadTime.');
      }

      // Use existing instance method
      await supplier.addProduct(productId, suppliedQuantity, leadTime);
    }

    return supplier;
  } catch (error) {
    throw new Error(`Error adding product(s) to supplier: ${error.message}`);
  }
};

/**
 * Remove products from a supplier's productsSupplied using supplierId
 * Can handle single or multiple productIds
 * @param {String} supplierId - The unique identifier of the supplier
 * @param {Array|String} productIds - Single productId or array of productIds
 * @returns {Object} - Updated supplier document
 */
const removeProductFromSupplier = async (supplierId, productIds) => {
  try {
    const supplier = await Supplier.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }

    // Ensure productIds is an array
    const productIdsArray = Array.isArray(productIds) ? productIds : [productIds];

    for (const productId of productIdsArray) {
      // Use existing instance method
      await supplier.removeProduct(productId);
    }

    return supplier;
  } catch (error) {
    throw new Error(`Error removing product(s) from supplier: ${error.message}`);
  }
};

/**
 * Get all suppliers linked to a specific warehouse by warehouseId
 * @param {String} warehouseId - The unique identifier of the warehouse
 * @returns {Array} - Array of supplier documents
 */
const getAllSuppliersByWarehouseId = async (warehouseId) => {
  try {
    const warehouse = await Warehouse.findOne({ warehouseId }).populate('linkedSuppliers');
    if (!warehouse) {
      throw new Error(`Warehouse with warehouseId ${warehouseId} not found.`);
    }
    return warehouse.linkedSuppliers;
  } catch (error) {
    throw new Error(`Error fetching suppliers by warehouseId: ${error.message}`);
  }
};

/**
 * Get all products supplied by suppliers linked to a specific warehouse
 * @param {String} warehouseId - The unique identifier of the warehouse
 * @returns {Array} - Array of products with supplier details
 */
const getSuppliersProductsOfWarehouse = async (warehouseId) => {
  try {
    const warehouse = await Warehouse.findOne({ warehouseId }).populate('linkedSuppliers');
    if (!warehouse) {
      throw new Error(`Warehouse with warehouseId ${warehouseId} not found.`);
    }

    const suppliers = warehouse.linkedSuppliers;

    const suppliersWithProducts = await Promise.all(
      suppliers.map(async (supplier) => {
        await supplier.populate('productsSupplied.productId'); // Assuming productId references Product model
        return {
          supplierId: supplier.supplierId,
          name: supplier.name,
          productsSupplied: supplier.productsSupplied,
        };
      })
    );

    return suppliersWithProducts;
  } catch (error) {
    throw new Error(`Error fetching suppliers' products for warehouseId: ${error.message}`);
  }
};

module.exports = {
  addSupplier,
  deleteSupplier,
  updateSupplier,
  addProductToSupplier,
  removeProductFromSupplier,
  getAllSuppliersByWarehouseId,
  getSuppliersProductsOfWarehouse,
};
