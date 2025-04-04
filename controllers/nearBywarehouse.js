
const Warehouse = require('../modal/warehouse');
const { haversineDistance } = require('../utils/distance');

const InventoryItem = require('../modal/InventoryItem');

/**
 * Retrieves the warehouseIds of warehouses within the "area of interest" based on the user's location.
 * 
 * @param {Number} userLat - User's latitude.
 * @param {Number} userLong - User's longitude.
 * @returns {Array} - Array of warehouseIds.
 */
const getWarehousesInAreaOfInterest = async (userLat, userLong) => {
  try {
    // Step 1: Retrieve all warehouses sorted by proximity to the user's location
    const nearbyWarehouses = await Warehouse.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [userLong, userLat] }, // [longitude, latitude]
          distanceField: 'distanceToUser',
          spherical: true,
          query: { archived: false }, // Exclude archived warehouses
          // No maxDistance to retrieve all relevant warehouses
        },
      },
      // Step 1a: Lookup InventoryItems to count the number of products per warehouse
      {
        $lookup: {
          from: 'inventoryitems', // Ensure this matches the actual collection name
          localField: 'warehouseId',
          foreignField: 'warehouseId',
          as: 'inventoryItems',
        },
      },
      // Step 1b: Add a field 'inventoryCount' representing the number of inventory items
      {
        $addFields: {
          inventoryCount: { $size: '$inventoryItems' },
        },
      },
      // Step 1c: Sort by distance to user
      {
        $sort: { distanceToUser: 1 },
      },
    ]);

    if (nearbyWarehouses.length === 0) {
      // No warehouses found
      return [];
    }

    // Step 2: Identify the 1st closest warehouse (W1) that has more than 2 inventory items
    let W1 = null;
    let D1 = null;

    for (const warehouse of nearbyWarehouses) {
      if (warehouse.inventoryCount > 2) {
        W1 = warehouse;
        D1 = warehouse.distanceToUser; // Distance in meters
        break;
      }
    }

    if (!W1) {
      // No warehouse found with more than 2 inventory items
      return [];
    }

    // Step 3: Identify the 4th closest warehouse (W4) based on distance
    // Note: W4 is based on overall proximity, not considering inventoryCount
    let W4 = null;
    if (nearbyWarehouses.length >= 4) {
      W4 = nearbyWarehouses[3];
    }

    let outerRadius = null; // To be determined

    if (W4) {
      // Calculate the distance between W1 and W4
      const W1Coords = W1.location.coordinates; // [lon, lat]
      const W4Coords = W4.location.coordinates; // [lon, lat]
      const D_W1_W4 = haversineDistance(
        W1Coords[1],
        W1Coords[0],
        W4Coords[1],
        W4Coords[0]
      );

      if (D_W1_W4 <= 20000) { // 20 km in meters
        // W4 is within 20 km of W1
        outerRadius = W4.distanceToUser;
      } else {
        // Find the next closest warehouse within 20 km of W1
        let found = false;
        for (let i = 4; i < nearbyWarehouses.length; i++) {
          const Wi = nearbyWarehouses[i];
          const WiCoords = Wi.location.coordinates;
          const D_W1_Wi = haversineDistance(
            W1Coords[1],
            W1Coords[0],
            WiCoords[1],
            WiCoords[0]
          );

          if (D_W1_Wi <= 20000) { // 20 km
            outerRadius = Wi.distanceToUser;
            found = true;
            break;
          }
        }

        if (!found) {
          // No warehouse within 20 km of W1; set area of interest to only W1
          outerRadius = D1;
        }
      }
    } else {
      // Fewer than 4 warehouses; set outer radius as distance to the last warehouse
      const lastWarehouse = nearbyWarehouses[nearbyWarehouses.length - 1];
      outerRadius = lastWarehouse.distanceToUser;
    }

    // Step 4: Define the "area of interest"
    // If outerRadius is equal to D1, include only W1
    // Else, include warehouses between D1 and outerRadius
    if (outerRadius <= D1 + 1) { // Adding 1 meter as a small epsilon
      // No "area of interest"; include only W1
      return [W1.warehouseId];
    }

    // Step 5: Retrieve all warehouses within the "area of interest"
    const warehousesInArea = await Warehouse.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [userLong, userLat] },
          distanceField: 'distanceToUser',
          spherical: true,
          query: { archived: false }, // Exclude archived warehouses
          maxDistance: outerRadius, // Upper bound of the area
        },
      },
      {
        $match: {
          distanceToUser: { $gte: D1 }, // Exclude warehouses closer than W1
        },
      },
      {
        $project: {
          _id: 0,
          warehouseId: 1,
          warehouseName: 1,
          location: 1,
          // Include other fields if necessary
        },
      },
    ]);

    // Step 6: Extract warehouseIds from the result
    const warehouseIds = warehousesInArea.map(wh => wh.warehouseId);

    return warehouseIds;
  } catch (error) {
    console.error('Error in getWarehousesInAreaOfInterest:', error);
    throw error; // Propagate the error to be handled upstream
  }
};


const findNearestWarehouseWithProduct = async (userLat, userLong, productId, variantId = null) => {
  try {
    console.log('Starting findNearestWarehouseWithProduct...');
    console.log(`User Location: Latitude ${userLat}, Longitude ${userLong}`);
    console.log(`Searching for Product ID: ${productId}, Variant ID: ${variantId || 'Not provided'}`);

    // Step 1: Fetch all warehouses with the required product/variant in stock
    const matchingInventoryItems = await InventoryItem.aggregate([
      {
        $match: {
          productId,
          ...(variantId && { variantId }), // Include variantId filter if provided
          stockQuantity: { $gt: 0 }, // Ensure there is stock available
        },
      },
      {
        $lookup: {
          from: 'warehouses', // Collection name for the Warehouse model
          localField: 'warehouseId',
          foreignField: 'warehouseId',
          as: 'warehouse',
        },
      },
      {
        $unwind: '$warehouse', // Deconstruct the warehouse array
      },
      {
        $project: {
          warehouseId: 1,
          warehouseName: '$warehouse.warehouseName',
          location: '$warehouse.location.coordinates', // Extract warehouse coordinates
          stockQuantity: 1,
        },
      },
    ]);

    if (matchingInventoryItems.length === 0) {
      console.error('No matching inventory items found for the provided product/variant.');
      return { message: 'No warehouse found with the requested product/variant in stock.' };
    }

    console.log(`Matching Inventory Items Found: ${JSON.stringify(matchingInventoryItems, null, 2)}`);

    // Step 2: Calculate the distance to each warehouse
    const distances = matchingInventoryItems.map((item) => {
      const [lon, lat] = item.location; // Coordinates are [longitude, latitude]
      const distance = haversineDistance(userLat, userLong, lat, lon);
      return { warehouseId: item.warehouseId, distance, warehouseName: item.warehouseName };
    });

    console.log(`Calculated Distances to Warehouses: ${JSON.stringify(distances, null, 2)}`);

    // Step 3: Find the nearest warehouse
    const nearestWarehouse = distances.reduce((min, current) =>
      current.distance < min.distance ? current : min
    );

    if (!nearestWarehouse) {
      console.error('No nearest warehouse could be determined from the calculated distances.');
      return { message: 'No warehouse found with the requested product/variant in stock.' };
    }

    console.log(`Nearest Warehouse: ${JSON.stringify(nearestWarehouse, null, 2)}`);

    return {
      warehouseId: nearestWarehouse.warehouseId,
      warehouseName: nearestWarehouse.warehouseName,
      distance: nearestWarehouse.distance, // Distance in meters
    };
  } catch (error) {
    console.error('Error occurred in findNearestWarehouseWithProduct:', error.message);
    console.error('Stack Trace:', error.stack);
    throw new Error('Internal server error while finding the nearest warehouse.');
  }
};


module.exports = { getWarehousesInAreaOfInterest, findNearestWarehouseWithProduct };
