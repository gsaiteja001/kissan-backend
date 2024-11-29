// services/salesService.js

const Sale = require('../models/Sale');

async function getSalesReport() {
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
      $project: {
        warehouseName: '$warehouse.warehouseName',
        productName: '$product.name',
        totalQuantitySold: 1,
      },
    },
    {
      $sort: { warehouseName: 1, totalQuantitySold: -1 },
    },
  ]);

  return salesData;
}


module.exports = {
  recordSale,
  getSalesReport,
  // ... other sales-related functions
};
