const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require('body-parser');

const axios = require('axios'); // Make sure axios is imported here

const jwt = require('jsonwebtoken');
const app = express();
const checkApiKey = require('./middlewares/checkApiKey');

const multer = require('multer');
const path = require('path');

const uploadForm = multer();

const { body, validationResult } = require('express-validator');


const PORT = 8086;
const mongo_uri = process.env.MONGO_URI || "mongodb+srv://teja:teja@cluster0.bgdbs80.mongodb.net/kissanfarm?retryWrites=true&w=majority&appName=Cluster0"

app.use(cors());
app.use(express.json());
// // Middleware to parse JSON bodies
// app.use(express.json({ limit: '50mb' }));

// // If you need to parse URL-encoded data (e.g., from forms), include this
// // Remove it if you don't need it
// app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }));



require('dotenv').config();

const crypto = require('crypto');

const farmers = require('./modal/farmers');
const Product = require('./modal/product');
const Order = require('./modal/order');
const Crop = require('./modal/crop');

const CropTemplate = require('./modal/croptemplate');

const Group = require('./modal/Group');

const cropDisease = require('./modal/cropDisease');
const PostAds = require('./modal/postAds');
const Diseases = require('./modal/Disease');
const PlantDiseases = require('./modal/multilangDiseases');
const farmerController = require('./controllers/farmerController');
const agricultureLandRental = require('./modal/agricultureLandRental')
const FertilizerRecommendation = require('./modal/fertilizerRecommendations');

const translateProduct = require('./utils/translateProduct');




// Apply to all routes
// app.use(checkApiKey);


// -------------------------  routes ---------------------------------------------------------------------

const orderRoutes = require('./routes/orderRoutes');
app.use('/orders', orderRoutes); 


const productsRoutes = require('./routes/products');
app.use('/api/products', productsRoutes);


const productRoutes = require('./routes/productRoutes');
app.use('/product', productRoutes);

const productCategoryRoutes = require('./routes/migrateCategories');
app.use('/productCategory', productCategoryRoutes);
const warehouseRoutes = require('./routes/warehouseRoutes');
app.use('/api/warehouses', warehouseRoutes);
const supplierRoutes = require('./routes/suppliers');
app.use('/suppliers', supplierRoutes);



const saleRoutes = require('./routes/saleRoutes');
app.use('/api/sale', saleRoutes);

const migrateCoordinatesRoutes = require('./routes/migrateCoordinates');
app.use('/api/migrateCoordinates', migrateCoordinatesRoutes);

const ShowCaseRoute = require('./routes/ShowCaseRoute');
app.use('/api/products/showcases', ShowCaseRoute);




// Import the migration routes and mount them
const migrationRoutes = require('./routes/migrationRoutes');
app.use('/migrate', migrationRoutes);




// Initialize Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kissanfarm-8c0ad-default-rtdb.asia-southeast1.firebasedatabase.app"
});



mongoose.connect(mongo_uri)
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((e) => {
    console.log("Error connecting to the database:", e);
  });


// Test endpoint to verify Firebase Admin integration
app.get('/test-firebase-admin', async (req, res) => {
  try {
    const db = admin.database();
    const ref = db.ref('test');
    await ref.set({ message: 'Firebase Admin is working!' });
    res.status(200).json({ message: 'Firebase Admin is working!' });
  } catch (error) {
    console.error('Error with Firebase Admin:', error);
    res.status(500).json({ error: 'Error with Firebase Admin' });
  }
});


// Import and use the upload route
const uploadRouter = require('./upload')
app.use('/upload', uploadRouter);


const productImage = require('./productImagesUpload')
app.use('/upload_product_image',productImage);


// app.post('/generateAppCheckToken', async (req, res) => {
//   try {
//     const appId = '1:457305600341:web:90185d6f6d5dcde5e37fdc'; // Replace with your actual appId
//     const token = await admin.appCheck().createToken(appId);
//     res.json({ token: token.token });
//   } catch (error) {
//     console.error('Error generating App Check token:', error);
//     res.status(500).json({ error: 'Failed to generate App Check token' });
//   }
// });



app.use(bodyParser.json({
  limit: '10mb',
  strict: true,  
}));


app.use(bodyParser.urlencoded({
  extended: true, 
  limit: '10mb',
  parameterLimit: 10000, 
}));




// GET route to fetch all fertilizer recommendations
app.get('/fertilizerRecommendations', async (req, res) => {
  try {
      const recommendations = await FertilizerRecommendation.find();
      res.status(200).json(recommendations);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching the data' });
  }
});

// POST route to upload JSON data
app.post('/upload/fertilizerRecommendations', async (req, res) => {
  try {
      const data = req.body;
      // Validate the data
      if (!Array.isArray(data)) {
          return res.status(400).json({ error: 'Data should be an array of objects' });
      }
      // Insert data into MongoDB
      await FertilizerRecommendation.insertMany(data);
      res.status(200).json({ message: 'Data uploaded successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while uploading data' });
  }
});


app.get('/api/crops', async (req, res) => {
  try {
    const crops = await cropDisease.distinct('cropname');
    console.log('cropssss..',crops);
    res.json(crops);
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ error: 'Server error while fetching crops.' });
  }
});

app.get('/api/diseases', async (req, res) => {
  const { cropname, name } = req.query;

  let query = {};
  if (cropname) {
    query.cropname = cropname;
  }
  if (name) {
    query.name = name;
  }

  try {
    const diseases = await cropDisease.find(query);
    if (!diseases || diseases.length === 0) {
      return res.status(404).json({ message: 'No diseases found.' });
    }
    res.json(diseases);
  } catch (error) {
    console.error('Error fetching diseases:', error);
    res.status(500).json({ error: 'Server error while fetching diseases.' });
  }
});

app.post('/api/diseases/search', async (req, res) => {
  const { cropname, name } = req.body;

  if (!cropname || !name) {
    return res.status(400).json({ error: 'cropname and name are required in the request body.' });
  }

  let query = { cropname, name };

  try {
    const diseases = await cropDisease.find(query);
    if (!diseases || diseases.length === 0) {
      return res.status(404).json({ message: 'No diseases found for the given crop and disease name.' });
    }
    res.json(diseases);
  } catch (error) {
    console.error('Error fetching diseases:', error);
    res.status(500).json({ error: 'Server error while fetching diseases.' });
  }
});




app.post('/api/diseases/details', async (req, res) => {  
  try {
    const { cropname, name } = req.body; 
    console.log(`Received body - cropname: ${cropname}, name: ${name}`); 

    if (!cropname || !name) {
      return res.status(400).json({ message: 'cropname and name are required' });
    }

    const disease = await cropDisease.findOne({
      cropname: { $regex: new RegExp(cropname, 'i') },
      name: { $regex: new RegExp(name, 'i') },
    });

    if (!disease) {
      return res.status(404).json({ message: 'Disease not found' });
    }

    res.json(disease);
  } catch (error) {
    console.error('Error fetching disease details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


// Get all diseases
app.get('/cropProtection/diseases', async (req, res) => {
  try {
      const diseases = await Diseases.find();
      res.status(200).json(diseases);
  } catch (error) {
      console.error("Error fetching diseases:", error);
      res.status(500).json({ error: "Failed to fetch diseases." });
  }
});


// Get all diseases ---------------------------------------------------------plant-disease-------------------------------------------------
app.get('/cropProtection/plant-diseases', async (req, res) => {
  try {
      const diseases = await PlantDiseases.find();
      res.status(200).json(diseases);
  } catch (error) {
      console.error("Error fetching diseases:", error);
      res.status(500).json({ error: "Failed to fetch diseases." });
  }
});



// GET /api/diseases?cropId={cropId}
app.get('/cropId/diseases', async (req, res) => {
  const { cropId } = req.query;

  if (!cropId) {
    return res.status(400).json({ error: 'cropId is required' });
  }

  try {
    const diseases = await Diseases.find({ cropId: cropId });
    res.json(diseases);
  } catch (error) {
    console.error('Error fetching diseases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get a specific disease by DiseaseId
app.get('/diseases/:diseaseId', async (req, res) => {
  const { diseaseId } = req.params;

  try {
      const disease = await Diseases.findOne({ DiseaseId: diseaseId });
      
      if (!disease) {
          return res.status(404).json({ error: "Disease not found." });
      }

      res.status(200).json(disease);
  } catch (error) {
      console.error("Error fetching disease:", error);
      res.status(500).json({ error: "Failed to fetch disease." });
  }
});


// Update a specific disease by DiseaseId
app.put('/diseases/:diseaseId', async (req, res) => {
  const { diseaseId } = req.params;
  const updateData = req.body;

  try {
      const updatedDisease = await Diseases.findOneAndUpdate(
          { DiseaseId: diseaseId }, 
          updateData,            
          { new: true }     
      );

      if (!updatedDisease) {
          return res.status(404).json({ error: "Disease not found." });
      }

      res.status(200).json({
          message: "Disease updated successfully",
          data: updatedDisease
      });
  } catch (error) {
      console.error("Error updating disease:", error);
      res.status(500).json({ error: "Failed to update disease." });
  }
});



//--------------------------plant disease -----------------------------------------

// Update a specific disease by DiseaseId
// Update a specific disease by DiseaseId
app.put('/plant-diseases/:diseaseId', async (req, res) => {
  const { diseaseId } = req.params;
  const updateData = { ...req.body };

  // Remove the _id field if it exists, as it is immutable.
  if (updateData._id) {
    delete updateData._id;
  }

  try {
    const updatedDisease = await PlantDiseases.findOneAndUpdate(
      { DiseaseId: diseaseId }, 
      updateData,            
      { new: true }     
    );

    if (!updatedDisease) {
      return res.status(404).json({ error: "Disease not found." });
    }

    res.status(200).json({
      message: "Disease updated successfully",
      data: updatedDisease
    });
  } catch (error) {
    console.error("Error updating disease:", error);
    res.status(500).json({ error: "Failed to update disease." });
  }
});

// Route to create a new disease
app.post('/new-plant-disease', async (req, res) => {
  const newDiseaseData = req.body;

  // Validation checks for required fields (you can add more validation rules as needed)
  if (!newDiseaseData.Disease || !newDiseaseData.Symptoms ) {
    return res.status(400).json({ error: 'Disease name, symptoms, and title are required.' });
  }
  const generatediseaseId = () => {
      const timestamp = Date.now();
      const randomDigits = Math.floor(Math.random() * 9000) + 1000;
      return `DiseaseId${timestamp}${randomDigits}`;
  };
  const diseaseId = generatediseaseId();
  // Create a new Disease object using the schema
  const newDisease = new PlantDiseases({
    DiseaseId: diseaseId,
    Disease: newDiseaseData.Disease,
    Symptoms: newDiseaseData.Symptoms,
    Favourable_Conditions: newDiseaseData.Favourable_Conditions,
    Management: newDiseaseData.Management,
    Stages: newDiseaseData.Stages,
    Title: newDiseaseData.Title,
    Mode_of_Spread_and_Survival: newDiseaseData.Mode_of_Spread_and_Survival,
    Viral_Phytoplasma_Disease_Control: newDiseaseData.Viral_Phytoplasma_Disease_Control,
    Cultural_Control: newDiseaseData.Cultural_Control,
    Chemical_Control: newDiseaseData.Chemical_Control,
    Biological_Control: newDiseaseData.Biological_Control,
    Botanical_Control: newDiseaseData.Botanical_Control,
    Genetic_Resistance: newDiseaseData.Genetic_Resistance,
    Soil_Amendments: newDiseaseData.Soil_Amendments,
    Trap_Methods: newDiseaseData.Trap_Methods,
    Preventive_Methods: newDiseaseData.Preventive_Methods,
    Other_Methods: newDiseaseData.Other_Methods,
    Pathogen: newDiseaseData.Pathogen,
    images: newDiseaseData.images,
    crop: newDiseaseData.crop,
    cropId: newDiseaseData.cropId,
  });

  try {
    // Save the new disease to the database
    const savedDisease = await newDisease.save();

    res.status(201).json({
      message: 'New disease added successfully.',
      data: savedDisease,
    });
  } catch (error) {
    console.error('Error saving new disease:', error);
    res.status(500).json({ error: 'Failed to add new disease.' });
  }
});





// app.post('/diseases/bulk-upload', async (req, res) => {
//   try {
//       // Expecting an array of disease objects in the request body
//       const diseasesData = req.body;

//       // Check if the data is an array
//       if (!Array.isArray(diseasesData) || diseasesData.length === 0) {
//           return res.status(400).json({ error: "Invalid input, expected an array of disease objects." });
//       }

//       // Save the data in bulk
//       const result = await Diseases.insertMany(diseasesData);

//       // Send a success response
//       res.status(201).json({ message: "Diseases uploaded successfully", data: result });
//   } catch (error) {
//       console.error("Error uploading diseases:", error);
//       res.status(500).json({ error: "Failed to upload diseases data" });
//   }
// });


// function generateDiseaseId() {
//   return `DIESEASEID${Date.now()}${Math.floor(Math.random() * 10000)}`;
// }

// // API endpoint to update each disease with a unique DiseaseId
// app.put('/diseases/update-ids', async (req, res) => {
//   try {
//       // Find all diseases
//       const diseases = await Diseases.find();

//       // Loop through each disease and update the DiseaseId
//       const updates = diseases.map(async (disease) => {
//           // Generate a new DiseaseId for each record
//           const diseaseId = generateDiseaseId();
//           disease.DiseaseId = diseaseId;
//           return disease.save(); // Save each updated document
//       });

//       // Wait for all updates to finish
//       await Promise.all(updates);

//       res.status(200).json({ message: "All diseases updated with new DiseaseId." });
//   } catch (error) {
//       console.error("Error updating DiseaseId for diseases:", error);
//       res.status(500).json({ error: "Failed to update DiseaseId for diseases." });
//   }
// });




// // POST endpoint to add a single CropCategory
// app.post('/diseases/batch', async (req, res) => {
//   try {
//     const diseases = req.body.diseases;

//     // Enhanced Logging
//     console.log('Received diseases data:', JSON.stringify(req.body, null, 2));
//     console.log('Type of req.body:', typeof req.body);
//     console.log('Number of Diseases:', Array.isArray(diseases) ? diseases.length : 0);

//     // Validate each disease object
//     const validatedDiseases = diseases.map((disease, index) => {
//       if (!disease.cropname || typeof disease.cropname !== 'string') {
//         throw new Error(`cropname is required and must be a string for disease at index ${index}.`);
//       }
//       if (!disease.name || typeof disease.name !== 'string') {
//         throw new Error(`Disease name is required and must be a string for disease at index ${index}.`);
//       }
//       if (!disease.description || typeof disease.description !== 'string') {
//         throw new Error(`Disease description is required and must be a string for disease at index ${index}.`);
//       }
//       // Add more validations as needed

//       return {
//         cropname: disease.cropname,
//         id: disease.id,
//         name: disease.name,
//         description: disease.description,
//         prevention: disease.prevention,
//         chemical_remedies: disease.chemical_remedies,
//         application_steps: disease.application_steps,
//         organic_remedies: disease.organic_remedies,
//         organic_application_steps: disease.organic_application_steps
//       };
//     });

//     // Insert multiple diseases at once
//     const savedDiseases = await cropDisease.insertMany(validatedDiseases);

//     // Respond with the saved documents
//     res.status(201).json({
//       message: `${savedDiseases.length} diseases added successfully.`,
//       data: savedDiseases
//     });
//   } catch (error) {
//     console.error('Error inserting diseases:', error);

//     // Handle validation errors from Mongoose
//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({ error: 'Validation Error', details: errors });
//     }

//     // Handle manual validation errors
//     if (error.message) {
//       return res.status(400).json({ error: error.message });
//     }

//     // Handle duplicate key errors (if any unique constraints are added later)
//     if (error.code === 11000) {
//       return res.status(400).json({ error: 'Duplicate key error', details: error.keyValue });
//     }

//     // Generic server error
//     res.status(500).json({ error: 'Server Error' });
//   }
// });

//-------------------------------------------------- API's on posts -------------------------------------------------------------------------


app.post('/api/add-post', async (req, res) => {
  try {
    const { imageUrls, farmerId, category, subCategory, description, additionalDetails } = req.body;

    // Validate required fields
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'At least one image URL is required.' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    if (!subCategory) {
      return res.status(400).json({ error: 'Sub-category is required.' });
    }

    if (!description) {
      return res.status(400).json({ error: 'Description is required.' });
    }
    
    const postId = `POSTID${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const newPost = new post({
      postId,
      farmerId,
      imageUrls,
      category: category.toLowerCase(),
      subCategory,
      description,
      additionalDetails,
    });

    const savedPost = await newPost.save();
    return res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await PostAds.find();
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts.' });
  }
});


// Endpoint: POST /api/posts/:postId/like
app.post('/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required to like a post.' });
  }
  try {
    const post = await PostAds.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: 'You have already liked this post.' });
    }
    post.likes.push(userId);
    await post.save();

    return res.status(200).json({ message: 'Post liked successfully.', likesCount: post.likes.length });
  } catch (error) {
    console.error('Error liking the post:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


// Endpoint: POST /api/posts/:postId/comment
app.post('/:postId/comment', async (req, res) => {
  const { postId } = req.params;
  const { commenterName, commenterId, commentText } = req.body;

  if (!commenterName || !commenterId || !commentText) {
    return res.status(400).json({ message: 'commenterName, commenterId, and commentText are required.' });
  }

  try {
    const post = await PostAds.findOne({ postId });

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const newComment = {
      commenterName,
      commenterId,
      commentText,
      commentedAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    return res.status(201).json({ message: 'Comment added successfully.', comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



//----------------------------------------- functions on farmers data on his crops --------------------------------------------------------


  
  const harvestCrop = async (farmerId, cropId) => {
    try {
      const farmer = await Farmer.findOne({ farmerId });
      if (!farmer) {
        throw new Error('Farmer not found');
      }
  
      await farmer.harvestCrop(cropId);
      return 'Crop harvested successfully';
    } catch (error) {
      throw error;
    }
  };

  const deleteCrop = async (farmerId, cropId) => {
    try {
      const farmer = await Farmer.findOne({ farmerId });
      if (!farmer) {
        throw new Error('Farmer not found');
      }
  
      // Remove from currentCrops
      const currentCropResult = farmer.currentCrops.id(cropId);
      if (currentCropResult) {
        currentCropResult.remove();
        await farmer.save();
        return 'Crop removed from currentCrops';
      }
  
      // Remove from completedCrops
      const completedCropResult = farmer.completedCrops.id(cropId);
      if (completedCropResult) {
        completedCropResult.remove();
        await farmer.save();
        return 'Crop removed from completedCrops';
      }
  
      throw new Error('Crop not found');
    } catch (error) {
      throw error;
    }
  };

  const updateCrop = async (farmerId, cropId, updatedData) => {
    try {
      const farmer = await Farmer.findOne({ farmerId });
      if (!farmer) {
        throw new Error('Farmer not found');
      }
  
      // Search in currentCrops
      let crop = farmer.currentCrops.id(cropId);
      if (crop) {
        Object.assign(crop, updatedData);
        await farmer.save();
        return crop;
      }
  
      // Search in completedCrops
      crop = farmer.completedCrops.id(cropId);
      if (crop) {
        Object.assign(crop, updatedData);
        await farmer.save();
        return crop;
      }
  
      throw new Error('Crop not found');
    } catch (error) {
      throw error;
    }
  };

  const getCrops = async (farmerId) => {
    try {
      const farmer = await Farmer.findOne({ farmerId }, 'currentCrops completedCrops');
      if (!farmer) {
        throw new Error('Farmer not found');
      }
  
      return {
        currentCrops: farmer.currentCrops,
        completedCrops: farmer.completedCrops,
      };
    } catch (error) {
      throw error;
    }
  };

  const addCrop = async (farmerId, cropData) => {
    try {
      const farmer = await Farmer.findOne({ farmerId });
      if (!farmer) {
        throw new Error('Farmer not found');
      }
  
      // Assign a unique cropId, e.g., using UUID or any unique generator
      cropData.cropId = generateUniqueCropId();
  
      farmer.currentCrops.push(cropData);
      await farmer.save();
  
      return farmer.currentCrops;
    } catch (error) {
      throw error;
    }
  };


// ========================================== functions on crops ========================================================
  

const addServiceToCrop = async (cropId, serviceData) => {
  try {
    const crop = await Crop.findOne({ cropId });
    if (!crop) {
      throw new Error('Crop not found');
    }

    await crop.addService(serviceData);
    console.log('Service Added:', serviceData);
  } catch (error) {
    console.error('Error adding service:', error.message);
  }
};

const serviceData = {
  ProviderId: '60d21b4967d0d8992e610c86',
  serviceType: 'Spraying',
  serviceDate: new Date('2024-05-01'),
  cost: 1500, 
  notes: 'Applied pesticide ABC',
};

// addServiceToCrop('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6', serviceData);



const recordSale = async (cropId, saleData) => {
  try {
    const crop = await Crop.findOne({ cropId });
    if (!crop) {
      throw new Error('Crop not found');
    }

    await crop.addSale(saleData);
    console.log('Sale Recorded:', saleData);
  } catch (error) {
    console.error('Error recording sale:', error.message);
  }
};


const saleData = {
  buyerId: '60d21b4a67d0d8992e610c87', 
  quantity: 100,
  pricePerUnit: 20,
  totalPrice: 2000,
  saleDate: new Date('2024-11-01'),
  status: 'Pending',
  notes: 'First sale to Buyer X',
};

// recordSale('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6', saleData);


// updating a crop through id 

const updateCropStatus = async (cropId, newStatus) => {
  try {
    const crop = await Crop.findOne({ cropId });
    if (!crop) {
      throw new Error('Crop not found');
    }

    await crop.updateStatus(newStatus);
    console.log(`Crop status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating crop status:', error.message);
  }
};

// Example Usage
// updateCropStatus('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6', 'Harvested');

// ================================================================= functions on orders ====================================================

// Example function to create an order
async function createOrder(farmerId, orderItems, paymentDetails, shippingAddress) {
  // Calculate distance (you might use a service like Google Maps API)
  const distance = calculateDistance(warehouseLocation, shippingAddress.coordinates);

  // Prepare shipping details
  const shippingDetails = {
    address: shippingAddress,
    distance: distance,
    estimatedDeliveryDate: calculateEstimatedDeliveryDate(distance),
    shippingMethod: 'Standard',
    carrier: 'Your Preferred Carrier',
  };

  // Create the order
  const order = new Order({
    orderId: generateUniqueOrderId(),
    farmerId: farmerId,
    orderItems: orderItems,
    paymentDetails: paymentDetails,
    shippingDetails: shippingDetails,
    statusHistory: [{ status: 'Placed', date: new Date(), remarks: 'Order placed successfully.' }],
  });

  // Save the order
  await order.save();

  // Update the farmer's currentOrders
  await Farmer.findByIdAndUpdate(farmerId, {
    $push: { currentOrders: order.orderId },
  });

  return order;
}

// ---------------------------------------------------------------- API's on Orders ---------------------------------------------------------------------------




  
// ============================================ functions on croptemplate ===============================================

const addCropFromTemplate = async (farmerId, cropTemplateId, selectedVariety, customData = {}) => {
  try {
    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer) {
      throw new Error('Farmer not found');
    }

    const cropTemplate = await CropTemplate.findOne({ cropId: cropTemplateId });
    if (!cropTemplate) {
      throw new Error('Crop template not found');
    }

    const variety = cropTemplate.varieties.find(v => v.varietyName === selectedVariety);
    if (!variety) {
      throw new Error('Selected variety not found in crop template');
    }

    const newCrop = new Crop({
      farmer: farmer._id,
      name: cropTemplate.name,
      scientificName: cropTemplate.scientificName,
      description: cropTemplate.description,
      varieties: [variety], // Assuming each crop instance has one variety
      plantingDate: customData.plantingDate || new Date(),
      expectedHarvestDate: customData.expectedHarvestDate || null,
      area: customData.area || 1, // Default area
      soilType: cropTemplate.growthRequirements.soilType,
      status: 'Planted',
      inputs: {
        fertilizer: customData.fertilizer || cropTemplate.growthRequirements.fertilizerNeeds,
        pesticide: customData.pesticide || cropTemplate.growthRequirements.pestSusceptibility,
        seeds: customData.seeds || 'Standard Seeds',
        irrigationMethod: cropTemplate.growthRequirements.irrigationMethod,
        otherInputs: customData.otherInputs || '',
      },
      notes: customData.notes || '',
    });

    await newCrop.save();

    // Optionally, add the crop to the farmer's currentCrops array
    farmer.currentCrops.push(newCrop._id);
    await farmer.save();

    console.log('New crop added based on template:', newCrop);
  } catch (error) {
    console.error('Error adding crop from template:', error.message);
  }
};

// addCropFromTemplate(
//   'FARMER123',
//   'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6', // Replace with actual CropTemplate cropId
//   'Durum', // Selected variety
//   {
//     plantingDate: new Date('2024-04-15'),
//     expectedHarvestDate: new Date('2024-10-15'),
//     area: 5, // 5 acres
//     fertilizer: 'Organic Urea',
//     pesticide: 'Insecticide ABC',
//     notes: 'Initial planting for the season',
//   }
// );



// new croptemplate addition

const createCropTemplate = async (cropData) => {
  try {
    const newCropTemplate = new CropTemplate(cropData);
    const savedTemplate = await newCropTemplate.save();
    console.log('Crop Template Created:', savedTemplate);
    return savedTemplate;
  } catch (error) {
    console.error('Error creating crop template:', error.message);
    throw error;
  }
};


// Retrieve all active crop templates
const getAllActiveCrops = async () => {
  try {
    const crops = await CropTemplate.find({ status: 'Active' });
    console.log('Active Crop Templates:', crops);
    return crops;
  } catch (error) {
    console.error('Error retrieving crop templates:', error.message);
    throw error;
  }
};

// Retrieve a specific crop template by cropId
const getCropTemplateById = async (cropId) => {
  try {
    const cropTemplate = await CropTemplate.findOne({ cropId });
    if (!cropTemplate) {
      throw new Error('Crop template not found');
    }
    console.log('Crop Template Found:', cropTemplate);
    return cropTemplate;
  } catch (error) {
    console.error('Error retrieving crop template:', error.message);
    throw error;
  }
};

// Example Usage
// getAllActiveCrops();
// getCropTemplateById('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6');


// ----------------------------update croptemplate -------------------------------------------------------------------------------------------------

const updateCropTemplate = async (cropId, updateData) => {
  try {
    const updatedCropTemplate = await CropTemplate.findOneAndUpdate(
      { cropId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedCropTemplate) {
      throw new Error('Crop template not found');
    }

    console.log('Crop Template Updated:', updatedCropTemplate);
    return updatedCropTemplate;
  } catch (error) {
    console.error('Error updating crop template:', error.message);
    throw error;
  }
};

// Example Usage
const updateData = {
  description: 'Updated description for Rice.',
  marketInfo: {
    typicalPricePerUnit: 1.3,
    marketDemand: 'Medium',
  },
  status: 'Active',
};

// updateCropTemplate('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6', updateData);


// GET /api/crops - Retrieve all active crop templates
app.get('/cropsTemplate', async (req, res) => {
  try {
    const crops = await CropTemplate.find({ status: 'Active' }).select('-__v');
    res.json(crops);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});



// GET /cropTemplates/:cropId - Retrieve crop template details by cropId
app.get('/cropTemplates/:cropId', async (req, res) => {
  try {
    const cropId = req.params.cropId;
    const cropTemplate = await CropTemplate.findOne({ cropId }).lean();

    if (!cropTemplate) {
      return res.status(404).json({ message: 'Crop Template not found' });
    }

    res.status(200).json(cropTemplate);
  } catch (error) {
    console.error('Error retrieving crop template:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /cropTemplates/:cropId/varieties - Retrieve crop varieties by cropId
app.get('/:cropId/varieties', async (req, res) => {
  try {
    const cropId = req.params.cropId;
    const cropTemplate = await CropTemplate.findOne({ cropId }, 'varieties').lean();

    if (!cropTemplate) {
      return res.status(404).json({ message: 'Crop Template not found' });
    }

    res.status(200).json(cropTemplate.varieties);
  } catch (error) {
    console.error('Error retrieving crop varieties:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk Upload Endpoint with Validation
app.post(
  '/api/crops/bulk-upload',
  [
    body().isArray().withMessage('Input data should be an array of crops.'),
    body('*.name').notEmpty().withMessage('Crop name is required.'),
    // Add more validation rules as needed
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const crops = req.body;

      // Insert many crops
      const insertedCrops = await CropTemplate.insertMany(crops, { ordered: false });

      res.status(201).json({
        message: `${insertedCrops.length} crops have been successfully uploaded.`,
        data: insertedCrops,
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
      res.status(500).json({
        message: 'An error occurred while uploading crops.',
        error: error.message,
      });
    }
  }
);


// --------------------------------------------------------------  API'S farmers -------------------------------------------------------------------


// POST /api/subscriptions - Create a new subscription
app.post('/api/subscriptions', async (req, res) => {
  const { subscriptionId, planType, duration, startDate, endDate, status, farmerId } = req.body;

  // Basic validation
  if (!subscriptionId || !planType || !duration || !startDate || !endDate || !status || !farmerId) {
    return res.status(400).json({ message: 'All fields (subscriptionId, planType, period, startDate, endDate, status, farmerId) are required.' });
  }

  // Validate planType
  const validPlans = ['gold', 'silver', 'free-trial'];
  if (!validPlans.includes(planType.toLowerCase())) {
    return res.status(400).json({ message: `Invalid plan type '${planType}'. Allowed types are: ${validPlans.join(', ')}.` });
  }

  // Validate period
  const validPeriods = ['1_month', '3_month', '6_month', '1_year', '30_days'];
  if (!validPeriods.includes(duration)) {
    return res.status(400).json({ message: `Invalid subscription period '${period}'. Allowed periods are: ${validPeriods.join(', ')}.` });
  }

  // Validate status
  const validStatuses = ['active', 'expired', 'cancelled'];
  if (!validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: `Invalid subscription status '${status}'. Allowed statuses are: ${validStatuses.join(', ')}.` });
  }

  try {
    // Find the farmer by farmerId
    const farmer = await farmers.findOne({ farmerId: farmerId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    // Check if subscriptionId already exists
    const existingSubscription = farmer.userSubscriptions.find(sub => sub.subscriptionId === subscriptionId);
    if (existingSubscription) {
      return res.status(400).json({ message: `Subscription ID '${subscriptionId}' already exists.` });
    }

    // Validate Date Formats
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for startDate or endDate. Use ISO8601 format.' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'endDate must be after startDate.' });
    }

    // Create the subscription object
    const newSubscription = {
      subscriptionId,
      planType,
      duration,
      startDate: start,
      endDate: end,
      status,
      amountPaid: req.body.amountPaid || '0', // Assign default if not provided
    };

    // Push the new subscription into userSubscriptions array
    farmer.userSubscriptions.push(newSubscription);

    // Save the farmer document
    await farmer.save();

    return res.status(200).json({ message: 'Subscription created successfully.', subscription: newSubscription });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


app.post('/subscribe-free-trial', async (req, res) => {
  const { farmerId } = req.body;

  try {
    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const currentDate = new Date();
    const existingFreeTrial = farmer.userSubscriptions.find(
      (sub) =>
        sub.planType === 'free-trial' &&
        sub.status === 'active' &&
        new Date(sub.endDate) > currentDate
    );

    if (existingFreeTrial) {
      return res
        .status(400)
        .json({ error: 'Free trial already active for this farmer' });
    }

    const newSubscription = {
      subscriptionId: 'sub_' + new Date().getTime(),
      planType: 'free-trial',
      price: 0,
      discount: 0,
      duration: '30 days',
      startDate: new Date(),
      endDate: undefined, // Will be set by the pre('validate') hook
      status: 'active',
    };

    farmer.userSubscriptions.push(newSubscription);

    await farmer.save();

    res.json(farmer);
  } catch (error) {
    console.error('Error activating free trial:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.put('/userType/farmers/:id', async (req, res) => {
  const farmerId = req.params.id;
  const updateData = req.body;

  try {
    // Step 1: Find the farmer document by farmerId
    const farmer = await farmers.findOne({ farmerId: farmerId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    // Step 2: Update the farmer document with the provided data
    // Use Object.assign to merge updateData into farmer
    Object.assign(farmer, updateData);

    // Step 3: Save the updated farmer document with validators
    const updatedFarmer = await farmer.save();

    // Respond with the updated farmer data
    res.status(200).json(updatedFarmer);
  } catch (error) {
    console.error('Error updating farmer:', error);
    if (error.name === 'ValidationError') {
      // Extract validation error messages
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation Error', errors });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});



app.get('/farmers/:id', async (req, res) => {
  try {
    const farmerId = req.params.id;
    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.status(200).json(farmer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



app.put('/:farmerId/crops', async (req, res) => {
  const { farmerId } = req.params;
  const { cropId, updatedFields } = req.body;

  // Basic validation
  if (!cropId || !updatedFields || typeof updatedFields !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request. "cropId" and "updatedFields" are required.',
    });
  }
  try {
    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found.',
      });
    }
    const cropIndex = farmer.currentCrops.findIndex(
      (crop) => crop.cropId === cropId
    );

    if (cropIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found.',
      });
    }

    if (updatedFields.farmId) {
      const farmExists = farmer.farms.some(
        (farm) => farm.farmId === updatedFields.farmId
      );

      if (!farmExists) {
        return res.status(400).json({
          success: false,
          message: `Farm ID '${updatedFields.farmId}' does not exist.`,
        });
      }
    }

    farmer.currentCrops[cropIndex] = {
      ...farmer.currentCrops[cropIndex].toObject(),
      ...updatedFields,
      cropId: farmer.currentCrops[cropIndex].cropId,
    };

    await farmer.save();

    return res.status(200).json({
      success: true,
      message: 'Crop details updated successfully.',
      data: farmer.currentCrops[cropIndex],
    });
  } catch (error) {
    console.error('Error updating crop details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
    });
  }
});


app.get('/farmers/:farmerId/cart', async (req, res) => {
  const { farmerId } = req.params;
  try {
    const farmer = await farmers.findOne({ farmerId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }
    res.status(200).json({ cartItems: farmer.cartItems });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


app.put('/farmers/:farmerId/cart', async (req, res) => {
  const { farmerId } = req.params;
  const { cartItems } = req.body;

  try {
    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ message: 'cartItems must be an array.' });
    }

    // Validate each cartItem
    const isValid = cartItems.every(item => {
      return item &&
        typeof item.productId === 'string' && item.productId.trim() !== '' &&
        item.sizeOption &&
        typeof item.sizeOption.size === 'string' && item.sizeOption.size.trim() !== '' &&
        typeof item.sizeOption.price === 'number' &&
        typeof item.quantity === 'number' && item.quantity > 0;
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Each cartItem must have productId, sizeOption (size and price), and quantity.' });
    }

    // Update cartItems for the specified farmer
    const farmer = await farmers.findOneAndUpdate(
      { farmerId },
      { cartItems },
      { new: true }
    );

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    res.status(200).json({ message: 'Cart updated successfully.', cartItems: farmer.cartItems });
  } catch (error) {
    console.error('Error updating cart items:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});



app.get('/farmers/savedaddress/:id', async (req, res) => {
  try {
    const farmerId = req.params.id;
    console.log('farmerid..', farmerId);

    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    if (!farmer.address || Object.keys(farmer.address).length === 0) {
      return res.status(404).json({ message: 'No address found for this farmer.' });
    }
    console.log('address..', farmer.address);
    res.status(200).json({ address: farmer.address });
  } catch (error) {
    console.error('Error fetching farmer address:', error);
    res.status(500).json({ error: 'Server error while fetching address.' });
  }
});


app.get('/fetchContacts', async (req, res) => {
  try {
    const farmer = await farmers.find({}, 'farmerId fullName phoneNumber location');

    const formattedFarmers = farmer.map(farmer => ({
      farmerId: farmer.farmerId,
      fullName: farmer.fullName,
      phoneNumber: farmer.phoneNumber,
      location: farmer.location
        ? `${farmer.location.lat}, ${farmer.location.long}`
        : 'N/A',
    }));

    res.status(200).json(formattedFarmers);
  } catch (error) {
    console.error('Error fetching contacts:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
});



app.post('/api/farmers/update-profile-picture', async (req, res) => {
  const { farmerId, profilePicture } = req.body;

  try {
    const updatedFarmer = await farmers.findOneAndUpdate(
      { farmerId },
      { profilePicture },
      { new: true }
    );

    if (!updatedFarmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.status(200).json({ message: 'Profile picture updated successfully' });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
});



// Update Address Endpoint
app.post('/api/farmers/:farmerId/address', async (req, res) => {
  const { farmerId } = req.params;
  const { fullName, phoneNumber, address, location } = req.body;

  // Validate required fields
  if (!fullName || !phoneNumber || !address || !address.location || !Array.isArray(address.location.coordinates)) {
    return res.status(400).json({
      message: 'Missing required fields: fullName, phoneNumber, address, or location.',
    });
  }

  try {
    // Find the farmer by farmerId
    const farmer = await farmers.findOne({ farmerId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    // Update the farmer's address and location
    farmer.fullName = fullName;
    farmer.phoneNumber = phoneNumber;
    farmer.address = {
      street: address.street || farmer.address.street,
      city: address.city || farmer.address.city,
      state: address.state || farmer.address.state,
      postalCode: address.postalCode || farmer.address.postalCode,
      country: address.country || farmer.address.country,
      location: address.location, 
    };


    // Save the updated farmer document
    await farmer.save();

    return res.status(200).json({ message: 'Address updated successfully.' });
  } catch (error) {
    console.error('Error updating address:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



// POST /api/farmers/:farmerId/farms
app.post('/api/farmers/:farmerId/farms', async (req, res) => {
  const { farmerId } = req.params;
  const { area, location, boundary, farmName } = req.body; 

  console.log('farmerId', farmerId);

  // Basic validation
  if (!area || !location || !boundary || !farmName) {
    return res.status(400).json({ message: 'Area, location, boundary, and farmName are required.' });
  }

  try {
    // Find the farmer by farmerId
    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    const farmId = `FARMID${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Check if farmId already exists to maintain uniqueness
    if (farmer.farms.some(farm => farm.farmId === farmId)) {
      return res.status(400).json({ message: 'Duplicate farmId generated. Please try again.' });
    }

    // Create a new farm entry
    const newFarm = {
      farmId,
      farmName: farmName || '',
      area,
      soilType: req.body.soilType || '',
      farmType: req.body.farmType || 'FullTimeFarmer',
      farmingCapacity: req.body.farmingCapacity || 'Small',
      location,
      surveyNumber: req.body.surveyNumber || '',
      boundary,
    };

    // Add the new farm to the farms array
    farmer.farms.push(newFarm);

    // Optionally, update profileCompleteness
    if (farmer.profileCompleteness < 100) {
      farmer.profileCompleteness = Math.min(farmer.profileCompleteness + 5, 100);
    }

    // Save the updated farmer document
    await farmer.save();

    return res.status(201).json({ message: 'Farm saved successfully.', farm: newFarm });
  } catch (error) {
    console.error('Error saving farm:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});
  
  



  app.post('/farmers/signup', async (req, res) => {
    try {
      const { fullName, phoneNumber, location } = req.body;

      const existingFarmer = await farmers.findOne({ phoneNumber });
      if (existingFarmer) {
        return res.status(400).json({ message: 'Farmer already exists with this phone number.' });
      }

      const farmerId = `FARMERID${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const newFarmer = new farmers({
        farmerId,
        fullName,
        phoneNumber,
        location: {
          lat: location.lat,
          long: location.long,
        },
        createdAt: new Date(),
      });

      await newFarmer.save();

      res.status(200).json({ message: 'Farmer created successfully.', farmerId });
    } catch (error) {

      console.error('Signup Error:', error);
      res.status(500).json({ error: error.message });
    }
  });





  // Login route
app.post('/farmers/login', async (req, res) => {
    const { phoneNumber } = req.body;
  
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
  
    try {
      const farmer = await farmers.findOne({ phoneNumber });
      if (!farmer) {
        return res.status(404).json({ message: 'Farmer not found. Please sign up.' });
      }
  
      res.status(200).json({ message: 'Login successful.', farmer });
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });


app.post('/updateFarmerCrops', async (req, res) => {
  const { farmerId, currentCrops } = req.body;

  // Validate request body
  if (!farmerId || !currentCrops || !Array.isArray(currentCrops)) {
    return res.status(400).json({ message: 'Invalid request data.' });
  }

  try {

    const farmer = await farmers.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    farmer.currentCrops = currentCrops;

    await farmer.save();

    return res.status(200).json({
      message: 'Crops updated successfully.',
      currentCrops: farmer.currentCrops,
    });
  } catch (error) {
    console.error('Error updating crops:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

//--------------------------------------------------------------------------------------products --------------------------------------------------

app.post('/products', async (req, res) => {
    try {
      const productData = req.body;
  
      // Create a new Product instance
      const newProduct = new Product(productData);
  
      // Save the product to the database
      await newProduct.save();
  
      res.status(201).json({ message: 'Product added successfully.', product: newProduct });
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ message: 'Error adding product.', error: error.message });
    }
  });



  app.post('/bulk-upload/translatedProducts', async (req, res) => {
    const products = req.body.products; // Expecting { products: [ ... ] }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products data is required and should be an array.' });
    }
    try {
      // Pre-insert calculations can be done here if needed
      // Use insertMany with validation
      const insertedProducts = await Product.insertMany(products, { ordered: false, runValidators: true });
  
      res.status(201).json({
        message: 'Bulk upload successful.',
        count: insertedProducts.length,
        products: insertedProducts,
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
  
      // Handle duplicate key errors (e.g., duplicate productId or sku)
      if (error.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern)[0];
        return res.status(409).json({ message: `Duplicate value for field: ${duplicatedField}` });
      }
  
      // Handle validation errors
      if (error.name === 'ValidationError') {
        // Extract detailed validation errors
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({ message: 'Validation Error', errors });
      }
  
      res.status(500).json({ message: 'Server error during bulk upload.', error: error.message });
    }
  });


/**
 * DELETE /api/products/deleteAllExcept
 * Deletes all products except those with productIds specified in the request body.
 * Expects a JSON body with an array of productIds to keep.
 */
app.delete('/deleteAllExcept', async (req, res) => {
  const { productIdsToKeep } = req.body;

  // Validate the input
  if (
    !productIdsToKeep ||
    !Array.isArray(productIdsToKeep) ||
    productIdsToKeep.length !== 3
  ) {
    return res.status(400).json({
      message:
        'Please provide an array of exactly three productIds to keep.',
    });
  }

  try {
    // Verify that the provided productIds exist
    const existingProducts = await Product.find({
      productId: { $in: productIdsToKeep },
    });

    if (existingProducts.length !== 3) {
      return res.status(404).json({
        message:
          'One or more productIds to keep do not exist.',
      });
    }

    // Delete all products except those with productIds in productIdsToKeep
    const result = await Product.deleteMany({
      productId: { $nin: productIdsToKeep },
    });

    res.json({
      message: `Deleted ${result.deletedCount} products.`,
    });
  } catch (error) {
    console.error('Error deleting products:', error);
    res
      .status(500)
      .json({ message: 'Server error while deleting products.' });
  }
});
  

app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  const lang = req.query.lang || 'en';

  try {
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const getTranslatedField = (field) => {
      if (field && typeof field === 'object') {
        if (field[lang] && typeof field[lang] === 'string') {
          return field[lang];
        } else if (field.en && typeof field.en === 'string') {
          return field.en;
        }
      }
      return 'Translation not available';
    };
    const translatedProduct = {
      discount: product.discount,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      _id: product._id,
      productId: product.productId,
      name: getTranslatedField(product.name),
      category: product.category,
      description: getTranslatedField(product.description),
      price: product.price,
      manufacturer: product.manufacturer,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      images: product.images,
      weight: product.weight,
      usageInstructions: getTranslatedField(product.usageInstructions),
      composition: getTranslatedField(product.composition),
      expirationDate: product.expirationDate,
      certifications: product.certifications,
      features: product.features.map((feature) => getTranslatedField(feature)),
      __v: product.__v,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      finalPrice: product.finalPrice,
      tags: product.tags,
      reviews: product.reviews,
    };

    res.json(translatedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/products', async (req, res) => {
  const lang = req.query.lang || 'en';

  try {
    const products = await Product.find();

    const translatedProducts = products.map((product) => translateProduct(product, lang));

    res.json(translatedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


  // // get all products
  // app.get('/products', async (req, res) => {
  //   try {
  //     const products = await Product.find();
  //     res.status(200).json(products);
  //   } catch (error) {
  //     res.status(500).json({ message: 'Error fetching products.', error: error.message });
  //   }
  // });


  app.get('/products/:id', async (req, res) => {
    try {
      const product = await Product.findOne(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching product.', error: error.message });
    }
  });




  app.get('/productdetails/cart', async (req, res) => {
    try {
      const { ids } = req.query; 
      if (!ids) {
        return res.status(400).json({ message: 'No product IDs provided.' });
      }
      const productIds = ids.split(',');
      const products = await Product.find({ productId: { $in: productIds } });
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching products.', error: error.message });
    }
  });




// Update product by productId
app.put('/products/:productId', async (req, res) => {
  try {
    // Find the product by productId
    const product = await Product.findOne({ productId: req.params.productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Update the product with the provided data
    Object.assign(product, req.body);

    // Save the updated product
    const updatedProduct = await product.save();

    res.status(200).json({ message: 'Product updated successfully.', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product.', error: error.message });
  }
});

  
  //delete product by ID
  app.delete('/products/:id', async (req, res) => {
    try {
      const deletedProduct = await Product.findOne({ productId:req.params.id});
      if (!deletedProduct) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting product.', error: error.message });
    }
  });

  app.post('/products/update-final-price', async (req, res) => {
    try {
      const products = await Product.find();
      for (const product of products) {
        await product.save(); 
      }
      res.status(200).json({ message: 'Final prices updated successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating final prices.', error: error.message });
    }
  });


  app.get('/similarProducts', async (req, res) => {
    console.log('Received request for /api/products/similar');
    console.log('Query Parameters:', req.query);
    
    const lang = req.query.lang || 'en';
    try {
      const { tags, productId, limit = 10 } = req.query;
      if (!tags) {
        console.log('Tags not provided.');
        return res.status(400).json({ message: 'Tags are required.' });
      }
      const tagsArray = tags.split(',').map(tag => tag.trim());
      const query = {
        tags: { $in: tagsArray },
      };
      if (productId) {
        query.productId = { $ne: productId };
      }
      console.log('Database Query:', query);
      const similarProducts = await Product.find(query).limit(parseInt(limit)).exec();
      console.log(`Found ${similarProducts.length} similar products.`);
      const translatedSimilarProducts = similarProducts.map((product) => translateProduct(product, lang));
      res.json(translatedSimilarProducts);
    } catch (error) {
      console.error('Error fetching similar products:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  



app.get('/similarManufacturer', async (req, res) => {
    console.log('Received request for /api/products/manufacturer');
    console.log('Query Parameters:', req.query);
  
    const lang = req.query.lang || 'en';
  
    try {
      const { manufacturer, productId, limit = 10 } = req.query;
  
      if (!manufacturer) {
        console.log('Manufacturer not provided.');
        return res.status(400).json({ message: 'Manufacturer is required.' });
      }
      
      const query = {
        manufacturer: manufacturer.trim(),
      };
  
      if (productId) {
        query.productId = { $ne: productId };
      }
  
      console.log('Database Query:', query);
  
      const manufacturerProducts = await Product.find(query).limit(parseInt(limit)).exec();
      console.log(`Found ${manufacturerProducts.length} manufacturer products.`);
  
      const translatedManufacturerProducts = manufacturerProducts.map((product) => translateProduct(product, lang));
  
      res.json(translatedManufacturerProducts);
    } catch (error) {
      console.error('Error fetching manufacturer products:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });


app.post('/products/:productId/reviews', async (req, res) => {
  const { productId } = req.params;
  const { user, rating, comment } = req.body;

  try {
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if the user has already reviewed the product
    const existingReview = product.reviews.find(review => review.user === user);

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Create and add the new review
    const newReview = { user, rating, comment };
    product.reviews.push(newReview);

    await product.save();

    res.status(201).json({ message: 'Review added successfully', review: newReview });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




// Add tag to product
app.patch('/products/:productId/add-tag', async (req, res) => {
  const { productId } = req.params;
  const { tag } = req.body;

  try {
    const product = await Product.findOneAndUpdate(
      { productId },
      { $addToSet: { tags: tag } }, // Avoid duplicates
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove tag from product
app.patch('/products/:productId/remove-tag', async (req, res) => {
  const { productId } = req.params;
  const { tag } = req.body;

  try {
    const product = await Product.findOneAndUpdate(
      { productId },
      { $pull: { tags: tag } },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// ----------------------------------------------------------------- Create Group ---------------------------------------------------------


app.post('/createGroup', async (req, res) => {
  try {
    const { groupName, cropType, cropId, members, createdBy, groupImage } = req.body;
    console.log('dataaaa...',groupName,cropType,groupImage,members,createdBy);
    if (!groupName || !cropId || !cropType || !members || !Array.isArray(members) || members.length === 0 || !createdBy) {
      return res.status(400).json({ message: 'Missing required fields: groupName, cropType, members, or createdBy.' });
    }
    for (const member of members) {
      const { name, phoneNumber, farmerId } = member;
      if (!name || !phoneNumber || !farmerId) {
        return res.status(400).json({ message: 'Each member must have name, phoneNumber, and farmerId.' });
      }
      const farmerExists = await farmers.findOne({ farmerId });
      if (!farmerExists) {
        return res.status(400).json({ message: `Farmer with farmerId ${farmerId} does not exist.` });
      }
    }

    const groupId = `GROUP${Date.now()}${Math.floor(Math.random() * 10000)}`;

    const newGroup = new Group({
      groupId,
      groupName,
      cropType,
      cropId,
      groupImage,
      members,  
      createdBy,
    });

    await newGroup.save();

    const nonCreatorMembers = members.filter(member => member.farmerId !== createdBy);

    await farmers.updateOne(
      { farmerId: createdBy },
      { $push: { groupsInvolved: { groupId, role: 'Admin', joinedDate: new Date() } } }
    );
    const memberIds = nonCreatorMembers.map(member => member.farmerId);

    if (memberIds.length > 0) {
      await farmers.updateMany(
        { farmerId: { $in: memberIds } },
        { $push: { groupsInvolved: { groupId, role: 'Member', joinedDate: new Date() } } }
      );
    }
 
     const groupData = newGroup.toObject();
     delete groupData.__v; 
 
 

     res.status(201).json({ message: 'Group created successfully', group: groupData });
  } catch (error) {
    console.error('Error creating group:', error.message);
    res.status(500).json({ error: 'An error occurred while creating the group.' });
  }
});


// GET /groups - Fetch all groups
app.get('/groups', async (req, res) => {
  try {
    const groups = await Group.find(); // Fetch all groups from the database
    res.json(groups); // Send back the groups as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

  //------------------------------------------------------------------ agriculture Land Renting -------------------------------------------


const generatePostedAdId = () => {
  const now = new Date();
  const timestamp = now.getTime();
  const randomNum = Math.floor(Math.random() * 10000);
  return `LandRentingPostId${timestamp}${randomNum}`;
};

app.get('/api/agriLandRentalPosts', async (req, res) => {
  try {
    const ads = await agricultureLandRental.find().sort({ postedDate: -1 });
    res.json(ads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.post('/api/agriLandRentalPost', async (req, res) => {
  try {
    const adData = req.body;

    adData.postedAdId = generatePostedAdId();

    if (
      !adData.location ||
      !adData.location.coordinates ||
      !Array.isArray(adData.location.coordinates) ||
      adData.location.coordinates.length !== 2
    ) {
      return res
        .status(400)
        .json({ message: 'Location coordinates are required and must be an array of [longitude, latitude].' });
    }
    const newAd = new agricultureLandRental(adData);

    const savedAd = await newAd.save();

    res.status(201).json(savedAd);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    // Handle duplicate postedAdId error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate Ad ID. Please try again.' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});



// GET /api/agriLandRentalPost/:postedAdId
app.get('/agriLandRentalPost/:postedAdId', async (req, res) => {
  const { postedAdId } = req.params;

  try {
    const ad = await agricultureLandRental.findOne({ postedAdId });

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    res.json(ad);
  } catch (error) {
    console.error('Error fetching ad by postedAdId:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
  


  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}...`);
  });
