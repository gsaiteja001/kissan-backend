const express = require('express');
const router = express.Router();
const translateProduct = require('../utils/translateProduct');
const Product = require('../modal/product'); 

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

module.exports = router;
