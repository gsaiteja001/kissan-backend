const express = require('express');
const router = express.Router();
const multer = require('multer');
const translateProduct = require('../utils/translateProduct');
const Product = require('../modal/product'); 
const { getProductIdsFromWarehouses } = require('../services/inventoryService');



const {updateProductVariants} = require('../controllers/productController');


const ProductsPackController = require('../controllers/ProductsPackController');
const ProductsShowCaseController = require('../controllers/ProductsShowCaseController');


const upload = multer({ dest: 'uploads/' });




// PUT endpoint to update variantIds
router.put('/update-variant-ids', async (req, res) => {
  try {
    const products = await Product.find({});
    console.log(`Found ${products.length} products.`);
    let updatedCount = 0;

    for (let product of products) {
      if (product.variants && product.variants.length > 0) {
        
        // Update each variant with a new unique variantId
        product.variants = product.variants.map((variant, index) => {
          // Generate a random 8-digit number based on Date.now() plus the index
          const randomPart = (Date.now() + index).toString().slice(-8);
          variant.variantId = `VARID${randomPart}`;
          return variant;
        });

        await product.save();
        updatedCount++;
        console.log(`Updated variant ids for product ${product.productId}`);
      }
    }
    console.log('Finished updating variant ids for all products.');
    res.status(200).json({
      message: 'Variant IDs updated successfully',
      updatedCount,
    });
  } catch (error) {
    console.error('Error updating variant ids:', error);
    res.status(500).json({
      error: 'Error updating variant ids',
      details: error.message,
    });
  }
});




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


// PUT /api/products/:productId/variants
router.put('/:productId/variants', updateProductVariants);

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


// GET /api/products/byCategory
// Example request: GET /api/products/byCategory?category=Fertilizers
router.get('/byCategory', async (req, res) => {
  try {
    const { category } = req.query;

    if (!category || category.trim() === '') {
      return res.status(400).json({ error: 'Category parameter is required.' });
    }

    // If you want 'all' to return all products without filtering,
    // you can handle that case here:
    if (category.toLowerCase() === 'all') {
      const allProducts = await Product.find({ archived: { $ne: true } }).lean();
      return res.json({ products: allProducts });
    }

    // Create a case-insensitive regex for the search term
    const searchTerm = new RegExp(category, 'i');

    // Use $or to match products where the category, tags, or manufacturer fields
    // contain the searchTerm. 
    // 'tags' is an array of strings, so we use { $in: [searchTerm] } with regex 
    // to match any tag that contains the query. For an array, we can do 
    // { tags: searchTerm } which will match if any element in 'tags' matches the regex.
    const query = {
      archived: { $ne: true },
      $or: [
        { category: searchTerm },
        { tags: searchTerm },
        { manufacturer: searchTerm }
      ]
    };

    const products = await Product.find(query).lean();

    // Return products in a JSON response
    res.json({ products });
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({
      error: 'Failed to fetch products. Please try again later.',
    });
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




// Pack routes
router.get('/packs', ProductsPackController.getAllPacks);
router.get('/packs/:packId', ProductsPackController.getPackById);
router.post('/packs', ProductsPackController.createPack);
router.put('/packs/:packId', ProductsPackController.updatePack);
router.delete('/packs/:packId', ProductsPackController.deletePack);

// Showcase routes
router.get('/showcases', ProductsShowCaseController.getAllShowCases);
router.get('/showcases/:warehouseId', ProductsShowCaseController.getShowCasesByWarehouse);
router.get('/showcases/:showcaseId', ProductsShowCaseController.getShowCaseById);
// Route for fetching showcases based on an array of showcaseIds (via query parameter)
router.get('/getShowCasesByIds', ProductsShowCaseController.getShowCasesByIds);

// Use upload.single('fileFieldName') to process single file uploads
router.post('/showcases', upload.fields([
  { name: 'headerImage', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'productBackgroundImage', maxCount: 1 },
  { name: 'productBaseImage', maxCount: 1 }
]), ProductsShowCaseController.createShowCase);
router.put('/showcases/:showcaseId', ProductsShowCaseController.updateShowCase);
router.delete('/showcases/:showcaseId', ProductsShowCaseController.deleteShowCase);





module.exports = router;
