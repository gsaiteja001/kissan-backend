const PurchaseOrder = require('./models/PurchaseOrder');
const LowStockAlert = require('./models/LowStockAlert');
const Supplier = require('./models/Supplier');
const Warehouse = require('./models/Warehouse');
const InventoryItem = require('./models/InventoryItem');
const mongoose = require('mongoose');

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
