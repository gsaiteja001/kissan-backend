const { haversineDistance } = require('../utils/distance');
const InventoryItem = require('../modal/InventoryItem');
const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');

exports.getDeliveryInfo = async (req, res) => {

 let { userLocation, productId, variantId, warehouseIds } = req.query;
  
  if (!userLocation) {
    return res.status(400).json({ message: 'Missing userLocation parameter' });
  }

  try {
    // Convert stringified userLocation to an object
    userLocation = JSON.parse(userLocation);

    warehouseIds = warehouseIds.split(',');

    // Step 1: Check inventory availability
    const inventoryItems = await InventoryItem.find({
      productId,
      variantId,
      warehouseId: { $in: warehouseIds },
      stockQuantity: { $gt: 0 },
    });

    // If no stock is available
    if (inventoryItems.length === 0) {
      return res.status(404).json({ message: 'No stock' });
    }

    // Step 2: Calculate the distance between the user and the warehouses
    const warehouseDistances = [];

    for (let inventoryItem of inventoryItems) {
      const warehouse = await Warehouse.findOne({ warehouseId: inventoryItem.warehouseId });
      if (warehouse && warehouse.location && warehouse.location.coordinates) {
        const warehouseLocation = warehouse.location.coordinates;
        const distance = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          warehouseLocation[1],  // Longitude
          warehouseLocation[0]   // Latitude
        );
        
        const distanceInKm = distance / 1000;

        // Step 3: Store warehouse info along with distance
        warehouseDistances.push({
          warehouseId: inventoryItem.warehouseId,
          distance: distanceInKm,
          productAvailability: inventoryItem.stockQuantity,
        });
      }
    }

    // If no warehouse found with valid distance, return "No stock"
    if (warehouseDistances.length === 0) {
      return res.status(404).json({ message: 'No stock' });
    }

    // Step 4: Select the warehouse with the shortest distance
    const selectedWarehouse = warehouseDistances.reduce((prev, curr) =>
      (prev.distance < curr.distance ? prev : curr)
    );

    // Step 5: Estimate delivery time (using your delivery time logic)
    let deliveryDays = 0;
    if (selectedWarehouse) {
      const { distance, weight } = selectedWarehouse;
      if (distance <= 50) {
        deliveryDays = weight <= 2 ? 2 : 3;
      } else if (distance <= 100) {
        deliveryDays = weight <= 2 ? 3 : 4;
      } else if (distance <= 200) {
        deliveryDays = weight <= 2 ? 4 : 5;
      } else if (distance <= 500) {
        deliveryDays = weight <= 2 ? 5 : 7;
      } else {
        deliveryDays = weight <= 2 ? 7 : 10;
      }
    }

    // Step 6: Return the response
    return res.status(200).json({
      warehouseId: selectedWarehouse.warehouseId,
      distance: selectedWarehouse.distance,
      deliveryDays: deliveryDays,
    });
  } catch (error) {
    console.error('Error estimating delivery info:', error);
    return res.status(500).json({ message: 'Error fetching delivery info' });
  }
};
