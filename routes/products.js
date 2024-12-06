const express = require('express');
const router = express.Router();
const translateProduct = require('../utils/translateProduct');
const Product = require('../modal/product'); 
const { getProductIdsFromWarehouses } = require('../services/inventoryService');


// Similar Products Route
router.get('/similarProducts', async (req, res) => {
  console.log('Received request for /api/products/similar');
  console.log('Query Parameters:', req.query);
  
  const lang = req.query.lang || 'en';
  try {
    const { tags, productId, limit = 10 } = req.query;
    if (!tags) {
      console.log('Tags not provided.');
      return res.status(400).json({ message: 'Tags are required.' });
    }
    const tagsArray = tags.split(',').map(tag => tag.trim());
    const query = {
      tags: { $in: tagsArray },
    };
    if (productId) {
      query.productId = { $ne: productId };
    }
    console.log('Database Query:', query);
    const similarProducts = await Product.find(query).limit(parseInt(limit)).exec();
    console.log(`Found ${similarProducts.length} similar products.`);
    const translatedSimilarProducts = similarProducts.map((product) => translateProduct(product, lang));
    res.json(translatedSimilarProducts);
  } catch (error) {
    console.error('Error fetching similar products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Manufacturer Products Route
router.get('/similarManufacturer', async (req, res) => {
  console.log('Received request for /api/products/manufacturer');
  console.log('Query Parameters:', req.query);

  const lang = req.query.lang || 'en';

  try {
    const { manufacturer, productId, limit = 10 } = req.query;

    if (!manufacturer) {
      console.log('Manufacturer not provided.');
      return res.status(400).json({ message: 'Manufacturer is required.' });
    }
    
    const query = {
      manufacturer: manufacturer.trim(),
    };

    if (productId) {
      query.productId = { $ne: productId };
    }

    console.log('Database Query:', query);

    const manufacturerProducts = await Product.find(query).limit(parseInt(limit)).exec();
    console.log(`Found ${manufacturerProducts.length} manufacturer products.`);

    const translatedManufacturerProducts = manufacturerProducts.map((product) => translateProduct(product, lang));

    res.json(translatedManufacturerProducts);
  } catch (error) {
    console.error('Error fetching manufacturer products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


/**
 * @route   POST /api/inventory/get-product-ids
 * @desc    Get unique productIds from multiple warehouses
 * @access  Public or Protected based on your authentication
 * @bodyParams
 *          - warehouseIds: Array of strings (required)
 */
router.post('/get-product-ids', async (req, res) => {
  try {
    const { warehouseIds } = req.body;

    // Input validation
    if (!warehouseIds || !Array.isArray(warehouseIds) || warehouseIds.length === 0) {
      return res.status(400).json({ message: 'warehouseIds array is required and cannot be empty.' });
    }

    // Fetch unique productIds
    const productIds = await getProductIdsFromWarehouses(warehouseIds);

    return res.status(200).json({ productIds });
  } catch (error) {
    console.error('Error in /api/inventory/get-product-ids:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


/**
 * @route   GET /api/productsByIds
 * @desc    Retrieve detailed product information based on product IDs with localization support
 * @access  Public or Protected based on your authentication
 * @queryParams
 *          - lang: String (optional, default: 'en')
 *          - ids: String (required, comma-separated productIds)
 * @returns {Array} - Array of localized product objects
 */
router.get('/productsByIds', async (req, res) => {
  console.log('Received request for /api/productsByIds');
  console.log('Query Parameters:', req.query);
  
  const lang = req.query.lang || 'en';
  const idsParam = req.query.ids;
  
  try {
    // Input Validation
    if (!idsParam || typeof idsParam !== 'string' || idsParam.trim() === '') {
      console.error('Invalid or missing "ids" parameter.');
      return res.status(400).json({ message: '"ids" query parameter is required and must be a non-empty string.' });
    }
    
    // Split the ids into an array and trim whitespace
    const productIds = idsParam.split(',').map(id => id.trim()).filter(id => id !== '');
    
    if (productIds.length === 0) {
      console.error('No valid product IDs provided after parsing.');
      return res.status(400).json({ message: 'At least one valid productId must be provided in the "ids" parameter.' });
    }
    
    console.log(`Fetching products with IDs: ${productIds.join(', ')}`);
    
    // Fetch products from the database
    const products = await Product.find({ productId: { $in: productIds } }).exec();
    
    console.log(`Found ${products.length} products.`);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found for the provided IDs.' });
    }
    
    // Localize products
    const localizedProducts = products.map(product => translateProduct(product, lang));
    
    console.log(`Returning ${localizedProducts.length} localized products.`);
    
    return res.status(200).json(localizedProducts);
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



/**
 * @route   GET /api/warehouses/area-of-interest
 * @desc    Get warehouses within the area of interest based on user's location
 * @access  Public or Protected based on your authentication
 * @queryParams
 *          - lat: Number (required) - User's latitude
 *          - long: Number (required) - User's longitude
 */
// router.get('/area-of-interest', async (req, res) => {
//   try {
//     const { lat, long } = req.query;

//     // Input validation
//     if (!lat || !long) {
//       return res.status(400).json({ message: 'Latitude and Longitude are required.' });
//     }

//     const userLat = parseFloat(lat);
//     const userLong = parseFloat(long);

//     if (isNaN(userLat) || isNaN(userLong)) {
//       return res.status(400).json({ message: 'Invalid latitude or longitude.' });
//     }

//     // Get warehouses in the area of interest
//     const warehouses = await getWarehousesInAreaOfInterest(userLat, userLong);

//     return res.status(200).json({ warehouses });
//   } catch (error) {
//     console.error('Error in /warehouses/area-of-interest:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// });


module.exports = router;
