const express = require('express');
const router = express.Router();
const SupplierController = require('../controllers/SupplierController');

/**
 * @route   POST /suppliers/create
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
 * @desc    Add product(s) to a supplier's productsSupplied
 * @access  Public (Update as per your authentication strategy)
 * @body    { productId, suppliedQuantity, leadTime } or [{ productId, suppliedQuantity, leadTime }, ...]
 */
router.post('/:supplierId/products', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products) {
      return res.status(400).json({ error: 'No product data provided.' });
    }

    // Determine if single product object or array
    const productsData = Array.isArray(products) ? products : [products];

    // Validate each product object
    for (const product of productsData) {
      if (!product.productId || product.suppliedQuantity == null || !product.leadTime) {
        return res.status(400).json({
          error: 'Each product must have productId, suppliedQuantity, and leadTime.',
        });
      }
    }

    const supplier = await SupplierController.addProductToSupplier(
      req.params.supplierId,
      productsData.length === 1 ? productsData[0] : productsData
    );
    res.status(200).json({ message: 'Product(s) added to supplier.', supplier });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   DELETE /suppliers/:supplierId/products
 * @desc    Remove product(s) from a supplier's productsSupplied
 * @access  Public (Update as per your authentication strategy)
 * @body    { productIds: "singleId" } or { productIds: ["id1", "id2", ...] }
 */
router.delete('/:supplierId/products', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds) {
      return res.status(400).json({ error: 'No productIds provided for removal.' });
    }

    // Determine if single productId or array
    const productIdsData = Array.isArray(productIds) ? productIds : [productIds];

    const supplier = await SupplierController.removeProductFromSupplier(
      req.params.supplierId,
      productIdsData.length === 1 ? productIdsData[0] : productIdsData
    );
    res.status(200).json({ message: 'Product(s) removed from supplier.', supplier });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @route   GET /suppliers/warehouse/:warehouseId
 * @desc    Get all suppliers linked to a specific warehouse
 * @access  Public (Update as per your authentication strategy)
 */
router.get('/warehouse/:warehouseId', async (req, res) => {
  try {
    const suppliers = await SupplierController.getAllSuppliersByWarehouseId(req.params.warehouseId);
    res.status(200).json({ suppliers });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @route   GET /suppliers/warehouse/:warehouseId/products
 * @desc    Get all products supplied by suppliers linked to a specific warehouse
 * @access  Public (Update as per your authentication strategy)
 */
router.get('/warehouse/:warehouseId/products', async (req, res) => {
  try {
    const suppliersProducts = await SupplierController.getSuppliersProductsOfWarehouse(req.params.warehouseId);
    res.status(200).json({ suppliersProducts });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
