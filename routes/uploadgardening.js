const express = require('express');
const router = express.Router();
const GardeningPlant = require('../modal/GardeningPlants'); 



// GET endpoint to fetch all GardeningPlant documents
router.get('/all', async (req, res) => {
    try {
      const plants = await GardeningPlant.find(); // Fetch all plants from the database
      res.status(200).json(plants);
    } catch (err) {
      console.error("Error fetching all plants:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // GET endpoint to fetch a specific GardeningPlant document by GardeningPlantId
router.get('/:gardeningPlantId', async (req, res) => {
    try {
      const { gardeningPlantId } = req.params;
      const plant = await GardeningPlant.findOne({ GardeningPlantId: gardeningPlantId });
  
      if (!plant) {
        return res.status(404).json({ error: "GardeningPlant not found" });
      }
  
      res.status(200).json(plant);
    } catch (err) {
      console.error("Error fetching plant by GardeningPlantId:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });


// PUT endpoint to update a GardeningPlant by GardeningPlantId
router.put('/:gardeningPlantId', async (req, res) => {
    try {
      const { gardeningPlantId } = req.params;
      const updatedData = req.body; // Data from the request body to update the GardeningPlant
  
      const plant = await GardeningPlant.findOneAndUpdate(
        { GardeningPlantId: gardeningPlantId }, // Find by GardeningPlantId
        updatedData, // Data to update
        { new: true } // Return the updated document
      );
  
      if (!plant) {
        return res.status(404).json({ error: "GardeningPlant not found" });
      }
  
      res.status(200).json({ message: "GardeningPlant updated successfully", data: plant });
    } catch (err) {
      console.error("Error updating plant:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });





// Helper function to generate a 15-digit GardeningPlantId
function generateGardeningPlantId() {
  // Date.now() returns 13 digits; add a random two-digit number to reach 15 digits.
  const randomTwoDigit = Math.floor(Math.random() * 90 + 10); // random number between 10 and 99
  return Date.now().toString() + randomTwoDigit.toString();
}

// POST endpoint for bulk uploading GardeningPlant documents
router.post('/bulkUpload', async (req, res) => {
  try {
    const bulkData = req.body; // expecting an array of objects

    if (!Array.isArray(bulkData)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of objects." });
    }

    // Map each object in the bulk data to match our GardeningPlant schema
    const plantsToUpload = bulkData.map(item => {
      return {
        GardeningPlantId: generateGardeningPlantId(),
        Name: item["Name"] || "",
        scientificName: item["Scientific Name"] || "",
        category: item["Category"] || "",
        subCategory: item["Sub-Category"] || "",
        taggedCategory: item["Tagged Category"] || "",
        region: item["Region"] || "",
        favourableConditions: item["Favourable Conditions"] || "",
        // Other fields (like images, growth_properties, etc.) are optional and can be added if needed.
      };
    });

    // Insert the array of GardeningPlant documents into the database
    const result = await GardeningPlant.insertMany(plantsToUpload);
    res.status(201).json({ message: "Bulk upload successful", data: result });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// DELETE endpoint to delete a GardeningPlant by GardeningPlantId
router.delete('/:gardeningPlantId', async (req, res) => {
    try {
      const { gardeningPlantId } = req.params;
      const plant = await GardeningPlant.findOneAndDelete({ GardeningPlantId: gardeningPlantId });
  
      if (!plant) {
        return res.status(404).json({ error: "GardeningPlant not found" });
      }
  
      res.status(200).json({ message: "GardeningPlant deleted successfully" });
    } catch (err) {
      console.error("Error deleting plant:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  

module.exports = router;
