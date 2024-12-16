// Pseudo-code example using node-cron
const cron = require('node-cron');
const InventoryItem = require('./modal/InventoryItem');
const LowStockAlert = require('./modal/LowStockAlert');

cron.schedule('0 * * * *', async () => { // Runs every hour
  try {
    const lowStockItems = await InventoryItem.find({ 
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
      resolved: false,
    });

    for (const item of lowStockItems) {
      const existingAlert = await LowStockAlert.findOne({ 
        warehouseId: item.warehouse,
        productId: item.product,
        variantId: item.variant,
        resolved: false,
      });

      if (!existingAlert) {
        await LowStockAlert.create({
          warehouseId: item.warehouse,
          productId: item.product,
          variantId: item.variant,
          currentStock: item.stockQuantity,
          reorderLevel: item.reorderLevel,
        });

        // Optionally send notification here
      }
    }
  } catch (error) {
    console.error('Error in low stock monitoring:', error);
  }
});
