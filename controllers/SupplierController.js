// controllers/SupplierController.js

const Supplier = require('../modal/Supplier');
const Product = require('../modal/Product'); 

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
 * Add a product to a supplier's productsSupplied using supplierId
 * @param {String} supplierId - The unique identifier of the supplier
 * @param {String} productId - The unique identifier of the product
 * @param {Number} suppliedQuantity - Quantity supplied
 * @param {String} leadTime - Lead time for the product
 * @returns {Object} - Updated supplier document
 */
const addProductToSupplier = async (supplierId, productId, suppliedQuantity, leadTime) => {
  try {
    const supplier = await Supplier.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }

    // Use existing instance method
    await supplier.addProduct(productId, suppliedQuantity, leadTime);
    return supplier;
  } catch (error) {
    throw new Error(`Error adding product to supplier: ${error.message}`);
  }
};

/**
 * Remove a product from a supplier's productsSupplied using supplierId
 * @param {String} supplierId - The unique identifier of the supplier
 * @param {String} productId - The unique identifier of the product
 * @returns {Object} - Updated supplier document
 */
const removeProductFromSupplier = async (supplierId, productId) => {
  try {
    const supplier = await Supplier.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier with supplierId ${supplierId} not found.`);
    }

    // Use existing instance method
    await supplier.removeProduct(productId);
    return supplier;
  } catch (error) {
    throw new Error(`Error removing product from supplier: ${error.message}`);
  }
};

module.exports = {
  addSupplier,
  deleteSupplier,
  updateSupplier,
  addProductToSupplier,
  removeProductFromSupplier,
};
