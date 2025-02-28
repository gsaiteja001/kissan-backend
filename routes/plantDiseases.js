const express = require('express');
const router = express.Router();
const MultilangDisease = require('../modal/multilangDiseases'); 

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
