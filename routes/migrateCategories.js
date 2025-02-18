const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../modal/product'); // Path to your Product model

/**
 * PUT /migrate-categories-raw
 * Fetches raw docs from the underlying collection (bypassing Mongoose schema),
 * then updates the category field to match the new CategorySchema.
 */
router.put('/migrate-categories-raw', async (req, res) => {
  try {
    // 1. Access the raw MongoDB collection backing the Product model
    const collection = Product.collection;
    
    // 2. Find all documents that *appear* to have a string in `category`.
    //    We'll match any doc where `category` is not an object (using $type: 2 for string).
    //    $type: 2 => string in MongoDB's internal type system
    //    Or you can do `category: { $exists: true }` if you want to pick up docs
    //    that might be missing `category` entirely, etc.
    const cursor = collection.find({ 
      category: { 
        $type: 2, // means 'string' in BSON
        $ne: ''   // not an empty string
      } 
    });

    let migratedCount = 0;
    let totalCount = 0;

    // We'll iterate each matching doc manually
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      totalCount++;

      // oldCategory is the string in the raw BSON doc
      const oldCategory = doc.category;

      if (!oldCategory || typeof oldCategory !== 'string') {
        // Just skip, though this *shouldn't* happen if $type: 2 matched.
        continue;
      }

      // 3. Build the new category object
      //    DO NOT set categoryId, let the pre('validate') hook generate it.
      //    We'll do it by loading the doc in Mongoose, updating, then saving.
      const updatedCategory = {
        categoryName: oldCategory.trim(),
        description: '',
      };

      // 4. Load it through Mongoose so that pre-validate + other hooks run
      //    We find by _id and re-save the document
      const product = await Product.findById(doc._id);
      if (!product) {
        continue; // doc might be missing or was removed in between
      }

      product.category = updatedCategory;
      // Mark as modified so Mongoose sees the change
      product.markModified('category');

      // 5. Save so that the CategorySchema.pre('validate') sets `categoryId`
      await product.save();

      migratedCount++;
    }

    await cursor.close();

    res.status(200).json({
      message: `Migration complete. Examined ${totalCount} document(s). Successfully migrated ${migratedCount} product(s).`
    });
  } catch (error) {
    console.error('Error in raw migration route:', error);
    res.status(500).json({ message: 'Server error during category migration', error });
  }
});




/**
 * PUT /fix-category-ids
 * 
 * This route will unify 'categoryId' for products that have the same 'categoryName'.
 * We keep the first encountered 'categoryId' for that categoryName.
 */
router.put('/fix-category-ids', async (req, res) => {
    try {
      // 1) Get all products
      const allProducts = await Product.find({});
  
      // 2) Build a categoryMap of categoryName => first encountered categoryId
      const categoryMap = {};
  
      for (const product of allProducts) {
        const { categoryName, categoryId } = product.category;
        
        // If we haven't stored an ID for this categoryName, store the first one we see
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = categoryId;
        }
      }
  
      // 3) Update all products so that products sharing the same categoryName
      //    also share the same categoryId
      for (const product of allProducts) {
        const { categoryName } = product.category;
        const correctId = categoryMap[categoryName];
  
        if (product.category.categoryId !== correctId) {
          // Only update if there's a mismatch
          product.category.categoryId = correctId;
          await product.save();
        }
      }
  
      return res.json({
        message: 'Category IDs unified successfully (keeping first encountered IDs).',
        categoryMap, // for your reference
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  });




  
module.exports = router;
