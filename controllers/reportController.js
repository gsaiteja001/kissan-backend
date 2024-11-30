// controllers/reportController.js

const Sale = require('../modal/Sale');
const Product = require('../modal/Product');
const Warehouse = require('../modal/Warehouse');

/**
 * @desc    Get top-selling products per warehouse
 * @route   GET /api/reports/top-selling-products
 * @access  Public (Adjust access as needed)
 */
exports.getTopSellingProducts = async (req, res, next) => {
  try {
    const topN = parseInt(req.query.top) || 5; // Number of top products to retrieve per warehouse

    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: {
            warehouse: '$warehouse',
            product: '$product',
          },
          totalQuantitySold: { $sum: '$quantitySold' },
        },
      },
      {
        $sort: { '_id.warehouse': 1, totalQuantitySold: -1 },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id.warehouse',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$warehouse',
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: '$warehouse._id',
          warehouseName: { $first: '$warehouse.warehouseName' },
          topProducts: {
            $push: {
              productId: '$product._id',
              productName: '$product.name.en',
              totalQuantitySold: '$totalQuantitySold',
            },
          },
        },
      },
      {
        $project: {
          warehouseName: 1,
          topProducts: { $slice: ['$topProducts', topN] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: salesData.length,
      data: salesData,
    });
  } catch (error) {
    next(error);
  }
};
