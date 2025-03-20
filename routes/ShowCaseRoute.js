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
  const { products } = req.body; // Expect an array of products

  try {
    // Validate if the showcase exists
    const showcase = await ShowCase.findOne({ showcaseId });
    if (!showcase) {
      return res.status(404).json({ message: 'Showcase not found' });
    }

    // Process products: add new ones and collect duplicates
    const duplicates = [];
    const newProducts = [];

    products.forEach(product => {
      if (!showcase.productIds.includes(product.productId)) {
        showcase.productIds.push(product.productId);
        newProducts.push(product.productId);
      } else {
        duplicates.push(product.productId);
      }
    });

    // Save the updated showcase
    await showcase.save();

    // Find the warehouse by warehouseId
    const warehouse = await Warehouse.findOne({ warehouseId });
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if the showcase is already linked to the warehouse; if not, add it.
    let warehouseLinked = false;
    if (!warehouse.showcaseId.includes(showcaseId)) {
      warehouse.showcaseId.push(showcaseId);
      await warehouse.save();
      warehouseLinked = true;
    }

    // Build a response message including duplicate info and warehouse linking status.
    let responseMessage = '';
    if (newProducts.length > 0 && duplicates.length > 0) {
      responseMessage = `New products added: ${newProducts.join(', ')}. Duplicate products skipped: ${duplicates.join(', ')}.`;
    } else if (newProducts.length > 0) {
      responseMessage = `Products added: ${newProducts.join(', ')}.`;
    } else if (duplicates.length > 0) {
      responseMessage = `All provided products were already added.`;
    }

    responseMessage += warehouseLinked
      ? ' Showcase linked to warehouse successfully.'
      : ' Showcase was already linked to warehouse.';

    res.status(200).json({ message: responseMessage });
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