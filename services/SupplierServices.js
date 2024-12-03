const Supplier = require('../modal/Supplier');
async function addProductToSupplier(supplierId, productId, suppliedQuantity, leadTime) {
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found.');
    }
    await supplier.addProduct(productId, suppliedQuantity, leadTime);
    console.log('Product added/updated successfully.');
  } catch (error) {
    console.error('Error adding product to supplier:', error.message);
  }
}
async function removeProductFromSupplier(supplierId, productId) {
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found.');
    }
    await supplier.removeProduct(productId);
    console.log('Product removed successfully.');
  } catch (error) {
    console.error('Error removing product from supplier:', error.message);
  }
}
