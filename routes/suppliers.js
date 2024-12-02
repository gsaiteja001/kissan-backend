// routes/suppliers.js

const express = require('express');
const router = express.Router();
const SupplierController = require('../controllers/SupplierController');

/**
 * @route   POST /suppliers
 * @desc    Add a new supplier
 * @access  Public (Update as per your authentication strategy)
 */
router.post('/create', async (req, res) => {
  try {
    const supplier = await SupplierController.addSupplier(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   DELETE /suppliers/:supplierId
 * @desc    Delete a supplier by supplierId
 * @access  Public (Update as per your authentication strategy)
 */
router.delete('/:supplierId', async (req, res) => {
  try {
    const supplier = await SupplierController.deleteSupplier(req.params.supplierId);
    res.status(200).json({ message: 'Supplier deleted successfully.', supplier });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @route   PUT /suppliers/:supplierId
 * @desc    Update an existing supplier by supplierId
 * @access  Public (Update as per your authentication strategy)
 */
router.put('/:supplierId', async (req, res) => {
  try {
    const supplier = await SupplierController.updateSupplier(req.params.supplierId, req.body);
    res.status(200).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /suppliers/:supplierId/products
 * @desc    Add a product to a supplier's productsSupplied
 * @access  Public (Update as per your authentication strategy)
 */
router.post('/:supplierId/products', async (req, res) => {
  const { productId, suppliedQuantity, leadTime } = req.body;
  try {
    const supplier = await SupplierController.addProductToSupplier(
      req.params.supplierId,
      productId,
      suppliedQuantity,
      leadTime
    );
    res.status(200).json({ message: 'Product added to supplier.', supplier });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   DELETE /suppliers/:supplierId/products/:productId
 * @desc    Remove a product from a supplier's productsSupplied
 * @access  Public (Update as per your authentication strategy)
 */
router.delete('/:supplierId/products/:productId', async (req, res) => {
  try {
    const supplier = await SupplierController.removeProductFromSupplier(
      req.params.supplierId,
      req.params.productId
    );
    res.status(200).json({ message: 'Product removed from supplier.', supplier });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
