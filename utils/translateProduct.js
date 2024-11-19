// utils/translateProduct.js

const translateProduct = (product, lang) => {
    const getTranslatedField = (field) => {
      if (field) {
        if (field[lang]) {
          return field[lang];
        } else if (field.en) {
          return field.en;
        }
      }
      return 'Translation not available';
    };
  
    return {
      _id: product._id,
      productId: product.productId,
      name: getTranslatedField(product.name),
      category: product.category,
      tags: product.tags,
      description: getTranslatedField(product.description),
      price: product.price,
      finalPrice: product.finalPrice,
      discount: product.discount,
      manufacturer: product.manufacturer,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      images: product.images,
      weight: product.weight,
      dimensions: product.dimensions,
      applicationMethod: getTranslatedField(product.applicationMethod),
      usageInstructions: getTranslatedField(product.usageInstructions),
      safetyInstructions: getTranslatedField(product.safetyInstructions),
      composition: getTranslatedField(product.composition),
      expirationDate: product.expirationDate,
      certifications: product.certifications,
      power: product.power,
      engineType: product.engineType,
      fuelType: product.fuelType,
      features: product.features.map((feature) => getTranslatedField(feature)),
      warranty: getTranslatedField(product.warranty),
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      reviews: product.reviews,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      __v: product.__v,
    };
  };
  
  module.exports = translateProduct;
  