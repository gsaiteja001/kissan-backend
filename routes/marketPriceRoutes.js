const express = require('express');
const MarketPrice = require('../modal/marketPrice');
const router = express.Router();

// ---------------------
// MarketPrice Endpoints
// ---------------------

// Create a new mandi MarketPrice record
router.post('/mandi-MarketPrice', async (req, res) => {
  try {
    const { mandiId, mandiName, mandiType, location, crops } = req.body;
    const newRecord = new MarketPrice({ mandiId, mandiName, mandiType, location, crops });
    const savedRecord = await newRecord.save();
    res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a mandi MarketPrice record by its _id (passed as a query parameter)
router.delete('/mandi-MarketPrice', async (req, res) => {
  try {
    const { id } = req.query; // expecting the document _id
    if (!id) {
      return res.status(400).json({ success: false, error: "Record id is required" });
    }
    const deletedRecord = await MarketPrice.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    res.status(200).json({ success: true, data: deletedRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retrieve mandi MarketPrice records (optionally filtered by mandiId)
router.get('/mandi-MarketPrice', async (req, res) => {
  try {
    const filter = {};
    if (req.query.mandiId) {
      filter.mandiId = req.query.mandiId;
    }
    const records = await MarketPrice.find(filter);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retrieve mandi records based on region (using location as a filter)
router.get('/region-mandis', async (req, res) => {
  try {
    const { location } = req.query;
    const filter = {};
    if (location) {
      filter.location = location;
    }
    const records = await MarketPrice.find(filter);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------
// Arrival Endpoints
// ---------------------

// GET: Retrieve all arrival records for a specific crop in a MarketPrice document
// Expects query parameters: marketPriceId and cropId
router.get('/arrival', async (req, res) => {
  try {
    const { marketPriceId, cropId } = req.query;
    if (!marketPriceId || !cropId) {
      return res.status(400).json({ success: false, error: "marketPriceId and cropId are required" });
    }
    const marketPriceDoc = await MarketPrice.findById(marketPriceId);
    if (!marketPriceDoc) {
      return res.status(404).json({ success: false, error: "MarketPrice document not found" });
    }
    const crop = marketPriceDoc.crops.find(c => c.cropId === cropId);
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }
    res.status(200).json({ success: true, data: crop.arrivals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Add a new arrival record to a specific crop in a MarketPrice document
// Expects body: marketPriceId, cropId, quantity, quantityType, (optional) date
router.post('/arrival', async (req, res) => {
  try {
    const { marketPriceId, cropId, quantity, quantityType, date } = req.body;
    if (!marketPriceId || !cropId || quantity === undefined || !quantityType) {
      return res.status(400).json({ success: false, error: "marketPriceId, cropId, quantity and quantityType are required" });
    }
    const marketPriceDoc = await MarketPrice.findById(marketPriceId);
    if (!marketPriceDoc) {
      return res.status(404).json({ success: false, error: "MarketPrice document not found" });
    }
    const crop = marketPriceDoc.crops.find(c => c.cropId === cropId);
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }
    const newArrival = { quantity, quantityType };
    if (date) newArrival.date = date;
    crop.arrivals.push(newArrival);
    await marketPriceDoc.save();
    res.status(201).json({ success: true, data: crop.arrivals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT: Update an existing arrival record for a specific crop in a MarketPrice document
// Expects body: marketPriceId, cropId, arrivalId, and fields to update (quantity, quantityType, date)
router.put('/arrival', async (req, res) => {
  try {
    const { marketPriceId, cropId, arrivalId, quantity, quantityType, date } = req.body;
    if (!marketPriceId || !cropId || !arrivalId) {
      return res.status(400).json({ success: false, error: "marketPriceId, cropId, and arrivalId are required" });
    }
    const marketPriceDoc = await MarketPrice.findById(marketPriceId);
    if (!marketPriceDoc) {
      return res.status(404).json({ success: false, error: "MarketPrice document not found" });
    }
    const crop = marketPriceDoc.crops.find(c => c.cropId === cropId);
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }
    // Use Mongoose subdocument helper to locate the arrival record
    const arrival = crop.arrivals.id(arrivalId);
    if (!arrival) {
      return res.status(404).json({ success: false, error: "Arrival record not found" });
    }
    if (quantity !== undefined) arrival.quantity = quantity;
    if (quantityType !== undefined) arrival.quantityType = quantityType;
    if (date !== undefined) arrival.date = date;
    await marketPriceDoc.save();
    res.status(200).json({ success: true, data: arrival });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
