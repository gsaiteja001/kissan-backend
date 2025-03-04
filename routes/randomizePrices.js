const express = require('express');
const router = express.Router();
const Product = require('../modal/product'); // adjust the path to your Product model

/**
 * POST /randomize-prices
 * Randomizes price, discount, and finalPrice for all products/variants.
 */
router.post('/randomize-prices', async (req, res) => {
  try {
    // Fetch all products (including archived or non-archived, adjust as needed)
    const products = await Product.find({});

    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        // Randomize each variant
        product.variants.forEach((variant) => {
          // Random price between 559 and 1199 (inclusive)
          const randomPrice = Math.floor(Math.random() * (1199 - 559 + 1)) + 559;
          // Random discount between 10 and 20 (inclusive)
          const randomDiscount = Math.floor(Math.random() * (20 - 10 + 1)) + 10;

          variant.price = randomPrice;
          variant.discount.amount = randomDiscount;
          variant.discount.discountType = 'Percentage'; // force discount type to "Percentage"
          // finalPrice will be auto-calculated in VariantSchema.pre('save') hook
        });
      } else {
        // Product has no variants, so randomize the product-level price/discount/finalPrice
        const randomPrice = Math.floor(Math.random() * (1199 - 559 + 1)) + 559;
        const randomDiscount = Math.floor(Math.random() * (20 - 10 + 1)) + 10;

        product.price = randomPrice;
        product.discount.amount = randomDiscount;
        product.discount.discountType = 'Percentage';
        // finalPrice will be calculated in the ProductSchema.pre('save') hook
      }

      // Save each product to trigger mongoose pre-save hooks
      await product.save();
    }

    res.status(200).json({
      message: 'Prices, discounts, and finalPrices were successfully randomized for all products!',
    });
  } catch (error) {
    console.error('Error randomizing product prices:', error);
    res.status(500).json({ error: 'An error occurred while randomizing prices.' });
  }
});

module.exports = router;
