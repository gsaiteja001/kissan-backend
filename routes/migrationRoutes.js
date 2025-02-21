// migrationRoutes.js
const express = require('express');
const router = express.Router();

// Old model (single-language)
const Disease = require('../modal/Disease');
// New model (multilingual)
const MultilangDisease = require('../modal/multilangDiseases');

/**
 * Helper: Transform an array of control method objects.
 * Each control method contains a descriptions array.
 * For each description, we wrap Title and Content as localized objects.
 */
function transformControlMethods(methods) {
  if (!Array.isArray(methods)) return [];
  return methods.map(method => {
    return {
      descriptions: Array.isArray(method.descriptions)
        ? method.descriptions.map(desc => ({
            Title: { en: desc.Title || "" },
            imageURL: desc.imageURL || "",
            Content: { en: desc.Content || "" }
          }))
        : [],
      products: method.products || []
    };
  });
}

/**
 * POST /migrate-diseases
 * This endpoint migrates all existing single-language Disease documents into the new multilangDisease schema.
 */
router.post('/migrate-diseases', async (req, res) => {
  try {
    // Fetch all old disease documents
    const oldDiseases = await Disease.find({});
    let migratedCount = 0;

    // Loop over each old document, transform fields, and save into new collection
    for (const oldDoc of oldDiseases) {
      const newDoc = new MultilangDisease({
        DiseaseId: oldDoc.DiseaseId,
        Disease: { en: oldDoc.Disease || "" },
        Symptoms: { en: oldDoc.Symptoms || "" },
        Favourable_Conditions: { en: oldDoc.Favourable_Conditions || "" },
        Management: { en: oldDoc.Management || "" },
        Stages: { en: oldDoc.Stages || "" },
        Title: { en: oldDoc.Title || "" },
        Mode_of_Spread_and_Survival: { en: oldDoc.Mode_of_Spread_and_Survival || "" },
        Viral_Phytoplasma_Disease_Control: { en: oldDoc.Viral_Phytoplasma_Disease_Control || "" },
        // Non-localized fields are copied as-is
        Pathogen: oldDoc.Pathogen,
        images: oldDoc.images,
        crop: oldDoc.crop,
        cropId: oldDoc.cropId,
        // Process nested control method fields
        Cultural_Control: transformControlMethods(oldDoc.Cultural_Control),
        Chemical_Control: transformControlMethods(oldDoc.Chemical_Control),
        Biological_Control: transformControlMethods(oldDoc.Biological_Control),
        Botanical_Control: transformControlMethods(oldDoc.Botanical_Control),
        Genetic_Resistance: transformControlMethods(oldDoc.Genetic_Resistance),
        Soil_Amendments: transformControlMethods(oldDoc.Soil_Amendments),
        Trap_Methods: transformControlMethods(oldDoc.Trap_Methods),
        Preventive_Methods: transformControlMethods(oldDoc.Preventive_Methods),
        Other_Methods: transformControlMethods(oldDoc.Other_Methods),
      });
      await newDoc.save();
      migratedCount++;
    }
    return res.status(200).json({ message: `${migratedCount} diseases migrated successfully` });
  } catch (err) {
    console.error("Migration error: ", err);
    return res.status(500).json({ error: "Migration failed", details: err.message });
  }
});

module.exports = router;
