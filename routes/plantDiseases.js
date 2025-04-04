const express = require('express');
const router = express.Router();
const MultilangDisease = require('../modal/multilangDiseases'); 
const CropTemplateModel = require('../modal/croptemplate');
const stringSimilarity = require('string-similarity');


// Add to your router file
const rateLimit = require('express-rate-limit');

// All languages in your LocalizedStringSchema:
const LANGUAGES = ['en', 'te', 'kn', 'ta', 'ml', 'bn', 'hi', 'ma', 'gu', 'od', 'pj', 'as'];

// All fields that have LocalizedStringSchema you want to enforce non-empty:
const LOCAL_STRING_FIELDS = [
  'Disease',
  'Symptoms',
  'Favourable_Conditions',
  'Management',
  'Stages',
  'Title',
  'Mode_of_Spread_and_Survival',
  'Viral_Phytoplasma_Disease_Control'
];

// Optional: other fields you also want to ensure are non-empty
const OTHER_FIELDS_TO_CHECK = [
  { field: 'Pathogen', isArray: false },
  { field: 'images', isArray: true }
];





// Rate limiting for the update endpoint
const updateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1, // Limit each IP to 1 request per windowMs
  message: 'Too many update requests from this IP, please try again after 10 minutes'
});






// Add this route to your router file
router.post('/diseases/by-cropIds', async (req, res) => {
  try {
    const { cropIds } = req.body;
    if (!cropIds || !Array.isArray(cropIds)) {
      return res.status(400).json({
        success: false,
        message: 'cropIds must be provided as an array'
      });
    }

    // Find diseases where the cropId is in the provided cropIds array
    const diseases = await MultilangDisease.find({ cropId: { $in: cropIds } });

    // Group the diseases by cropId for separate and complete results per cropId
    const groupedDiseases = cropIds.reduce((result, cropId) => {
      result[cropId] = diseases.filter(disease => disease.cropId === cropId);
      return result;
    }, {});

    return res.status(200).json({
      success: true,
      data: groupedDiseases
    });
  } catch (error) {
    console.error('Error fetching diseases by cropIds:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message
    });
  }
});





// Add this route
router.post('/diseases/update-crops', updateLimiter, async (req, res) => {
  try {
    console.log('Starting crop reference update process...');
    
    // Execute the update function
    const startTime = Date.now();
    const { processedCount, updatedCount, updates } = await updateCropReferences();
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    return res.status(200).json({
      success: true,
      message: 'Crop references updated successfully',
      duration: `${duration}ms`,
      processedCount,  // Now using destructured variables
      updatedCount,    // from the update function's return
      updates
    });

  } catch (error) {
    console.error('[POST /diseases/update-crops] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Crop reference update failed',
      details: error.message
    });
  }
});


// Modified update function with proper error handling
async function updateCropReferences() {
  try {
    // Get crop templates from database
    const cropTemplates = await CropTemplateModel.find({});
    if (!cropTemplates.length) {
      throw new Error('No crop templates found in database');
    }

    // Create normalized map
    const cropMap = cropTemplates.reduce((acc, template) => {
      const normalized = template.name.toLowerCase().trim().replace(/\s+/g, ' ');
      acc[normalized] = {
        id: template.cropId,
        name: template.name
      };
      return acc;
    }, {});

    // Get diseases with non-empty crop names
    const diseases = await MultilangDisease.find({ crop: { $exists: true, $ne: "" } });
    const updatedItems = new Map();

    // Batch update operations
    const bulkOps = [];
    
    for (const disease of diseases) {
      const originalCrop = disease.crop;
      const normalizedInput = originalCrop.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Match finding logic
      let bestMatch = cropMap[normalizedInput];
      if (!bestMatch) {
        const matches = stringSimilarity.findBestMatch(normalizedInput, Object.keys(cropMap));
        if (matches.bestMatch.rating > 0.85) {
          bestMatch = cropMap[matches.bestMatch.target];
        }
      }

      if (bestMatch) {
        if (disease.cropId !== bestMatch.id || disease.crop !== bestMatch.name) {
          bulkOps.push({
            updateOne: {
              filter: { _id: disease._id },
              update: {
                $set: {
                  cropId: bestMatch.id,
                  crop: bestMatch.name
                }
              }
            }
          });

          const key = `${originalCrop}→${bestMatch.name}`;
          if (!updatedItems.has(key)) {
            updatedItems.set(key, {
              original: originalCrop,
              updatedTo: bestMatch.name,
              cropId: bestMatch.id
            });
          }
        }
      }
    }

    // Execute bulk operation
    if (bulkOps.length > 0) {
      await MultilangDisease.bulkWrite(bulkOps);
    }

    return {
      processedCount: diseases.length,
      updatedCount: updatedItems.size,
      updates: [...updatedItems.values()]
    };

  } catch (error) {
    console.error('Error updating crop references:', error);
    throw error;
  }
}







  // Add this route to your existing router file
  router.get('/diseases/crops', async (req, res) => {
    try {
        const crops = await MultilangDisease.aggregate([
            // Filter out documents without crop name
            { $match: { crop: { $exists: true, $ne: "" } } },
            
            // Group by crop name and collect unique cropIds
            {
                $group: {
                    _id: "$crop",
                    cropIds: { $addToSet: "$cropId" }
                }
            },
            
            // Project the desired format and handle empty cropIds
            {
                $project: {
                    _id: 0,
                    crop: "$_id",
                    cropId: {
                        $let: {
                            vars: {
                                filteredIds: {
                                    $filter: {
                                        input: "$cropIds",
                                        as: "id",
                                        cond: { $and: [
                                            { $ne: ["$$id", null] },
                                            { $ne: ["$$id", ""] }
                                        ]}
                                    }
                                }
                            },
                            in: { $arrayElemAt: ["$$filteredIds", 0] }
                        }
                    }
                }
            },
            
            // Sort alphabetically by crop name
            { $sort: { crop: 1 } }
        ]);
  
        return res.status(200).json(crops);
    } catch (error) {
        console.error('[GET /diseases/crops] Error:', error);
        return res.status(500).json({
            error: 'An error occurred while fetching unique crops.',
            details: error.message
        });
    }
  });



router.get('/diseases/non-empty', async (req, res) => {
    try {
      // Get conditions and projections for localized fields
      const { localizedConditions, localizedFieldsProjection } = getNonEmptyLocalizedFields();
      
      // Get conditions for other fields (Pathogen, images, etc.)
      const otherConditions = getNonEmptyOtherFields();
  
      // Combine localized and other field conditions into a final query
      const query = {
        $and: [
          ...localizedConditions,
          ...otherConditions
        ]
      };
  
      // Perform the query with projection to include only non-empty localized fields
      const diseases = await MultilangDisease.find(query).select(localizedFieldsProjection);
  
      // Check if we received diseases in the response
      if (diseases.length === 0) {
        console.log('No diseases found with non-empty fields.');
      }
  
      // Return the response with non-empty fields
      return res.status(200).json(diseases);
    } catch (error) {
      console.error('[GET /diseases/non-empty] Error:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching non-empty diseases.',
        details: error.message
      });
    }
  });
  
  // The function to retrieve conditions for localized fields
  function getNonEmptyLocalizedFields() {
    const localizedConditions = [];
    const localizedFieldsProjection = {};
  
    for (const field of LOCAL_STRING_FIELDS) {
      const fieldConditions = [];
      for (const lang of LANGUAGES) {
        const langPath = `${field}.${lang}`;
        fieldConditions.push({ [langPath]: { $exists: true, $ne: '' } }); // Non-empty check for each language
      }
  
      localizedConditions.push({
        $and: fieldConditions // Use $and to ensure all languages have non-empty values
      });
  
      localizedFieldsProjection[field] = 1; // Include the field in the response if it is non-empty
    }
  
    return { localizedConditions, localizedFieldsProjection };
  }
  
  // The function to retrieve conditions for other fields (Pathogen, images, etc.)
  function getNonEmptyOtherFields() {
    const otherConditions = [];
    for (const { field, isArray } of OTHER_FIELDS_TO_CHECK) {
      if (isArray) {
        otherConditions.push({ [`${field}.0`]: { $exists: true } }); // Ensure array has at least one element
      } else {
        otherConditions.push({ [field]: { $exists: true, $ne: '' } }); // Ensure string field is non-empty
      }
    }
  
    return otherConditions;
  }


  

module.exports = router;
