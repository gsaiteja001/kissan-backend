const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Farmer = require('../modal/farmers');



// Get Search History by farmerId
router.get('/getSearchHistory/:farmerId', async (req, res) => {
  const { farmerId } = req.params;
  
  try {
    const farmer = await Farmer.findOne({ farmerId }).select('searchHistory');
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json(farmer.searchHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/api/searchHistory/searches', async (req, res) => {
    const { query, lat1, lon1, lat2, lon2 } = req.query;  // Coordinates of the bounding box
    
    try {
      const farmerSearchHistory = await Farmer.aggregate([
        { $unwind: '$searchHistory' },
        { 
          $match: {
            'searchHistory.query': { $regex: query, $options: 'i' },  // Search query filter
            'searchHistory.location.coordinates': {
              $geoWithin: {
                $box: [
                  [lon1, lat1],  // Bottom-left corner
                  [lon2, lat2]   // Top-right corner
                ]
              }
            }
          }
        },
        { $project: { searchHistory: 1, _id: 0 } }  // Only return searchHistory
      ]);
      
      res.json(farmerSearchHistory);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });



// View All Search Histories for All Users
router.get('/api/searchHistory', async (req, res) => {
    try {
      const allSearchHistory = await Farmer.aggregate([
        { $unwind: '$searchHistory' },
        { $project: { farmerId: 1, searchHistory: 1 } }
      ]);
      res.json(allSearchHistory);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });




// Delete a Specific Search Query by queryId
router.delete('/deleteQuery/:farmerId/:_id', async (req, res) => {
  const { farmerId, _id } = req.params;

  try {
    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Find the index of the search history entry with the specific _id
    const queryIndex = farmer.searchHistory.findIndex(query => query._id.toString() === _id);
    if (queryIndex === -1) {
      return res.status(404).json({ message: 'Search query not found' });
    }

    // Remove the search history entry
    farmer.searchHistory.splice(queryIndex, 1);
    await farmer.save();

    res.json({ message: 'Search query deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

  
  
// Post a New Search Query
router.post('/save/:farmerId', async (req, res) => {
  const { farmerId } = req.params;
  const { query, category, location, resultsCount, additionalInfo } = req.body;

  // Create the new search history object
  const newSearchHistory = {
    query,
    category,
    location,
    resultsCount,
    additionalInfo,
    searchDate: new Date() // Optional: add the current date
  };

  try {
    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer) {
      console.log('Farmer not found:', farmerId);
      return res.status(404).json({ message: 'Farmer not found' });
    }
  
    // Log and save the new search history
    console.log('New search history:', newSearchHistory);
    farmer.searchHistory.push(newSearchHistory);
    await farmer.save();
  
    res.status(201).json(newSearchHistory);
  } catch (err) {
    console.error('Error saving search history:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

  
  module.exports = router;
