// routes/warehouses.js
const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse'); // Adjust the path as necessary
const logger = require('../utils/logger'); // Ensure you have a logger set up
const authenticate = require('../middleware/authenticate'); // Optional: Import authentication middleware

/**
 * @route   POST /api/warehouses/migrate-coordinates
 * @desc    Migrate existing 'coordinates' to the new 'location' field in Warehouse documents
 * @access  Protected (e.g., Admins only)
 * @returns {Object} - Summary of migration results
 */
router.post('/migrate-coordinates', 
  // Optional: Apply authentication middleware to protect the route
  authenticate, 
  async (req, res) => {
    try {
      logger.info('Migration started: Coordinating to Location.');

      // Step 1: Find all warehouses that have 'coordinates' but do not have 'location'
      const warehousesToMigrate = await Warehouse.find({
        coordinates: { $exists: true, $ne: null },
        location: { $exists: false },
      }).exec();

      logger.info(`Found ${warehousesToMigrate.length} warehouses to migrate.`);

      if (warehousesToMigrate.length === 0) {
        return res.status(200).json({ message: 'No warehouses require migration.', migratedCount: 0 });
      }

      // Step 2: Iterate over each warehouse and update the 'location' field
      let migratedCount = 0;

      for (const warehouse of warehousesToMigrate) {
        const { coordinates } = warehouse.address; // Assuming 'coordinates' is nested under 'address'

        if (
          coordinates &&
          typeof coordinates.latitude === 'number' &&
          typeof coordinates.longitude === 'number'
        ) {
          // Construct the GeoJSON Point
          const location = {
            type: 'Point',
            coordinates: [coordinates.longitude, coordinates.latitude], // [longitude, latitude]
          };

          // Update the warehouse document
          warehouse.location = location;

          // Optionally, remove the old 'coordinates' field
          // Uncomment the next line if you want to remove the 'coordinates' after migration
          // warehouse.address.coordinates = undefined;

          await warehouse.save();
          migratedCount += 1;
        } else {
          logger.warn(`Invalid coordinates for Warehouse ID: ${warehouse.warehouseId}. Skipping migration for this document.`);
        }
      }

      logger.info(`Migration completed: ${migratedCount} warehouses migrated.`);

      return res.status(200).json({ 
        message: `Migration completed successfully. ${migratedCount} warehouses migrated.`,
        migratedCount 
      });
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`);
      return res.status(500).json({ message: 'Migration failed.', error: error.message });
    }
  }
);

module.exports = router;
