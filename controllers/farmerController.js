// // controllers/farmerController.js
// const Farmer = require('../modal/farmers');

// /**
//  * Update Crop Details for a Farmer
//  * Endpoint: PUT /farmers/:farmerId/crops
//  */
// exports.updateCropDetails = async (req, res) => {
//   const { farmerId } = req.params;
//   const { currentCrops } = req.body;

//   // Basic validation
//   if (!currentCrops || !Array.isArray(currentCrops)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid crop details. "currentCrops" should be an array.',
//     });
//   }

//   try {
//     // Find the farmer by farmerId
//     const farmer = await Farmer.findOne({ farmerId });

//     if (!farmer) {
//       return res.status(404).json({
//         success: false,
//         message: 'Farmer not found.',
//       });
//     }

//     // Update the currentCrops field
//     farmer.currentCrops = currentCrops;

//     // Optionally, update profileCompleteness based on some logic
//     // For example, increase by 10% for each crop detail updated
//     // Here, we'll skip it or implement as needed

//     // Save the updated farmer document
//     await farmer.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Crop details updated successfully.',
//       data: farmer.currentCrops,
//     });
//   } catch (error) {
//     console.error('Error updating crop details:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error. Please try again later.',
//     });
//   }
// };
