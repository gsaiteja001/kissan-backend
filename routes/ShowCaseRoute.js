const express = require('express');
const router = express.Router();
const ShowCase = require('../modal/ShowCase'); 
const Warehouse = require('../modal/warehouse');  
const Pack = require('../modal/Pack');



// Endpoint to fetch showcaseIds based on warehouseIds
router.post('/get-showcase-ids', async (req, res) => {
  const { warehouseIds } = req.body;

  if (!Array.isArray(warehouseIds) || warehouseIds.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty warehouseIds array' });
  }

  try {
    // Fetch the warehouses that match the warehouseIds
    const warehouses = await Warehouse.find({ warehouseId: { $in: warehouseIds } });

    if (!warehouses || warehouses.length === 0) {
      return res.status(404).json({ error: 'No warehouses found for the provided warehouseIds' });
    }

    // Extract the showcaseIds from the found warehouses
    const showcaseIds = warehouses.reduce((acc, warehouse) => {
      if (Array.isArray(warehouse.showcaseId)) {
        acc.push(...warehouse.showcaseId);
      }
      return acc;
    }, []);

    // Remove duplicates (in case multiple warehouses have the same showcaseId)
    const uniqueShowcaseIds = [...new Set(showcaseIds)];

    // Send the response with the list of showcaseIds
    return res.json({ showcaseIds: uniqueShowcaseIds });
  } catch (error) {
    console.error('Error fetching showcaseIds:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/:showcaseId/products/:warehouseId', async (req, res) => {
  const { showcaseId, warehouseId } = req.params;
  const { products } = req.body;  // Get array of products

  try {
    // Validate if the showcaseId exists in the ShowCase collection
    const showcase = await ShowCase.findOne({ showcaseId });

    if (!showcase) {
      return res.status(404).json({ message: 'Showcase not found' });
    }

    // Check if any of the products are already in the showcase
    for (let product of products) {
      if (showcase.productIds.includes(product.productId)) {
        return res.status(400).json({ message: `Product ${product.productId} already added to showcase` });
      }
    }

    // Add products to the showcase
    products.forEach(product => showcase.productIds.push(product.productId));

    // Save the updated showcase
    await showcase.save();

    // Now, update the warehouse document by pushing the showcaseId into the warehouse's showcaseId field
    const warehouse = await Warehouse.findOne({ warehouseId });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if the showcaseId is already linked to the warehouse
    if (warehouse.showcaseId.includes(showcaseId)) {
      return res.status(400).json({ message: 'Showcase already linked to warehouse' });
    }

    // Push the showcaseId to the warehouse document
    warehouse.showcaseId.push(showcaseId);

    // Save the updated warehouse
    await warehouse.save();

    // Respond with success message
    res.status(200).json({ message: 'Products added to showcase and showcase linked to warehouse successfully' });
  } catch (error) {
    console.error('Error in adding products to showcase and updating warehouse:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.post('/packs/:packId/products', async (req, res) => {
  const { packId } = req.params;
  const { products } = req.body;  // Get array of products

  try {
    // Validate if the packId exists in the Pack collection
    const pack = await Pack.findOne({ packId });

    if (!pack) {
      return res.status(404).json({ message: 'Pack not found' });
    }

    // Add products to the pack
    products.forEach(product => pack.productIds.push(product.productId));

    // Save the updated pack
    await pack.save();

    // Respond with success message
    res.status(200).json({ message: 'Products added to pack successfully' });
  } catch (error) {
    console.error('Error in adding products to pack:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




module.exports = router;
