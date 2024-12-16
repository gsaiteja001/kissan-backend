const mongoose = require('mongoose');
const StockTransaction = require('./models/StockTransaction');
const PurchaseOrder = require('./models/PurchaseOrder');
const LowStockAlert = require('./models/LowStockAlert');
const Supplier = require('./models/Supplier');
const Warehouse = require('./models/Warehouse');
const InventoryItem = require('./models/InventoryItem');

const cron = require('node-cron');

cron.schedule('*/30 * * * *', async () => { // Runs every 30 minutes
  try {
    await redistributeInventory();
    await generatePurchaseOrders();
  } catch (error) {
    console.error('Error in scheduled tasks:', error);
  }
});


async function generatePurchaseOrders() {
  // Step 1: Fetch unresolved LowStockAlerts
  const alerts = await LowStockAlert.find({ resolved: false }).populate('warehouseId').populate('productId').populate('variantId');

  // Step 2: Group alerts by product and variant
  const grouped = {};
  alerts.forEach(alert => {
    const key = `${alert.productId}-${alert.variantId || 'default'}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(alert);
  });

  // Step 3: Iterate over each group and create PurchaseOrders
  for (const key in grouped) {
    const [productId, variantId] = key.split('-');
    
    // Step 3a: Find all alerts for this product
    const productAlerts = grouped[key];

    // Step 3b: Determine total required quantity
    const totalRequired = productAlerts.reduce((sum, alert) => sum + (alert.reorderLevel - alert.currentStock), 0);

    // Step 3c: Find nearest supplier(s) who supply this product
    // Assuming each supplier has a location and supplies specific products
    const suppliers = await Supplier.find({ 
      'productsSupplied.productId': productId,
      archived: false,
    });

    if (suppliers.length === 0) {
      console.warn(`No suppliers found for productId: ${productId}`);
      continue;
    }

    // Step 3d: Find the nearest supplier to the majority of the warehouses
    // Calculate the centroid of warehouse locations for these alerts
    const warehouses = await Warehouse.find({ _id: { $in: productAlerts.map(a => a.warehouseId) } });
    const centroid = calculateCentroid(warehouses.map(w => w.location.coordinates));

    // Find the supplier closest to the centroid
    let nearestSupplier = null;
    let minDistance = Infinity;
    for (const supplier of suppliers) {
      const distance = calculateDistance(centroid, supplier.location.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSupplier = supplier;
      }
    }

    if (!nearestSupplier) {
      console.warn(`No suitable supplier found for productId: ${productId}`);
      continue;
    }

    // Step 3e: Create PurchaseOrder
    const orderItems = [{
      productId: productId,
      variantId: variantId === 'default' ? undefined : variantId,
      quantity: totalRequired,
      unitPrice: await getProductUnitPrice(productId, variantId, nearestSupplier),
      totalPrice: await getProductUnitPrice(productId, variantId, nearestSupplier) * totalRequired,
    }];

    // Step 3f: Allocate to warehouses
    const allocations = productAlerts.map(alert => ({
      warehouseId: alert.warehouseId._id,
      allocatedQuantity: alert.reorderLevel - alert.currentStock,
    }));

    const purchaseOrder = await PurchaseOrder.create({
      supplierId: nearestSupplier._id,
      products: orderItems,
      allocations: allocations,
      status: 'Pending',
      paymentStatus: 'Pending',
      notes: `Automated order for low stock replenishment of product ${productId}`,
    });

    // Step 3g: Update LowStockAlerts as resolved
    await LowStockAlert.updateMany(
      { _id: { $in: productAlerts.map(a => a._id) } },
      { $set: { resolved: true, purchaseOrder: purchaseOrder._id } }
    );

    // Optionally, notify relevant parties or update dashboards
  }
}

// Helper function to calculate centroid
function calculateCentroid(coordinatesArray) {
  const numPoints = coordinatesArray.length;
  const sum = coordinatesArray.reduce((acc, coord) => {
    acc[0] += coord[0];
    acc[1] += coord[1];
    return acc;
  }, [0, 0]);
  return [sum[0] / numPoints, sum[1] / numPoints];
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1, coord2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c;
  return distance; // in km
}

// Helper function to get unit price from supplier
async function getProductUnitPrice(productId, variantId, supplier) {
  // Assuming productsSupplied has unit prices or negotiate logic
  // For simplicity, return a fixed price or fetch from supplier's data
  // You may need to adjust based on your data model
  return 10; // Placeholder value
}


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
