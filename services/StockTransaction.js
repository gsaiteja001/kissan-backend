const StockTransaction = require('./models/StockTransaction');

async function redistributeInventory() {
  // Step 1: Identify warehouses needing stock
  const alerts = await LowStockAlert.find({ resolved: false }).populate('warehouseId').populate('productId').populate('variantId');

  for (const alert of alerts) {
    const { warehouseId, productId, variantId, currentStock, reorderLevel } = alert;
    const neededQuantity = reorderLevel - currentStock;

    // Step 2: Find nearby warehouses with excess stock
    const nearbyWarehouses = await findNearbyWarehousesWithExcess(productId, variantId, warehouseId);

    let remainingNeed = neededQuantity;

    for (const sourceWarehouse of nearbyWarehouses) {
      if (remainingNeed <= 0) break;

      const sourceInventory = await InventoryItem.findOne({
        warehouse: sourceWarehouse._id,
        product: productId,
        variant: variantId || undefined,
      });

      if (sourceInventory && sourceInventory.stockQuantity > sourceInventory.reorderLevel) {
        const availableToTransfer = sourceInventory.stockQuantity - sourceInventory.reorderLevel;
        const transferQuantity = Math.min(availableToTransfer, remainingNeed);

        if (transferQuantity > 0) {
          // Step 3: Execute transfer
          sourceInventory.stockQuantity -= transferQuantity;
          sourceInventory.lastUpdated = new Date();
          await sourceInventory.save();

          let destInventory = await InventoryItem.findOne({
            warehouse: warehouseId,
            product: productId,
            variant: variantId || undefined,
          });

          if (!destInventory) {
            destInventory = await InventoryItem.create({
              warehouse: warehouseId,
              product: productId,
              variant: variantId || undefined,
              stockQuantity: transferQuantity,
              reorderLevel: 10, // or fetch from existing data
            });
          } else {
            destInventory.stockQuantity += transferQuantity;
            destInventory.lastUpdated = new Date();
            await destInventory.save();
          }

          remainingNeed -= transferQuantity;

          // Step 4: Record StockTransaction
          await StockTransaction.create({
            transactionType: 'moveStock',
            warehouseId: sourceWarehouse.warehouseId,
            products: [{
              productId,
              variantId: variantId || undefined,
              quantity: transferQuantity,
              unit: 'units', // Adjust as per your unit system
              unitPrice: 0, // Not applicable for transfers
            }],
            relatedTransactionType: 'StockTransaction',
            relatedTransaction: null, // Or link to another transaction if needed
            performedBy: 'System', // Or the user initiating the transfer
            notes: `Transferred ${transferQuantity} units of product ${productId} from warehouse ${sourceWarehouse.warehouseId} to warehouse ${warehouseId}`,
          });
        }
      }
    }

    // Optionally, notify relevant parties about the redistribution
  }
}

// Helper function to find nearby warehouses with excess stock
async function findNearbyWarehousesWithExcess(productId, variantId, targetWarehouseId, maxDistance = 50) { // maxDistance in km
  const targetWarehouse = await Warehouse.findById(targetWarehouseId);
  if (!targetWarehouse) return [];

  // Find suppliers within maxDistance
  const nearbySuppliers = await Supplier.find({
    'location.coordinates': {
      $near: {
        $geometry: targetWarehouse.location,
        $maxDistance: maxDistance * 1000, // convert km to meters
      },
    },
    archived: false,
  });

  const nearbyWarehouseIds = nearbySuppliers.flatMap(supplier => supplier.linkedSuppliers);

  // Find warehouses within maxDistance that have excess stock
  const nearbyWarehouses = await Warehouse.find({
    _id: { $ne: targetWarehouseId },
    'location.coordinates': {
      $near: {
        $geometry: targetWarehouse.location,
        $maxDistance: maxDistance * 1000,
      },
    },
  });

  // Filter warehouses that have excess stock for the product
  const excessWarehouses = [];
  for (const warehouse of nearbyWarehouses) {
    const inventory = await InventoryItem.findOne({
      warehouse: warehouse._id,
      product: productId,
      variant: variantId || undefined,
    });
    if (inventory && inventory.stockQuantity > inventory.reorderLevel) {
      excessWarehouses.push(warehouse);
    }
  }

  return excessWarehouses;
}
