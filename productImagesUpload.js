const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configure AWS S3 Client
const s3 = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer storage (memory storage for direct upload to S3)
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Define the upload route
router.post('/', upload.single('image'), async (req, res) => {
  const file = req.file;

  // Validate that a file was uploaded
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Extract the file extension
  const fileExtension = file.originalname.split('.').pop();

  // Generate a unique and desired name for the image
  const desiredName = `${uuidv4()}.${fileExtension}`; // e.g., '123e4567-e89b-12d3-a456-426614174000.jpg'

  // Define S3 upload parameters, including the folder path
  const params = {
    Bucket: 'gadupathi', 
    Key: `kissanfarm_products/${desiredName}`, 
    Body: file.buffer,
    ContentType: file.mimetype,

  };

  try {
    // Create and send the PutObjectCommand to upload the file
    const command = new PutObjectCommand(params);
    await s3.send(command);

    // Construct the image URL based on your S3 bucket configuration
    const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    
    // Respond with the image URL
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ message: 'Error uploading file to S3.', error: error.message });
  }
});



router.post('/showCase_products_upload', upload.single('image'), async (req, res) => {
  const file = req.file;

  // Validate that a file was uploaded
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Extract the file extension
  const fileExtension = file.originalname.split('.').pop();

  // Generate a unique and desired name for the image
  const desiredName = `${uuidv4()}.${fileExtension}`; // e.g., '123e4567-e89b-12d3-a456-426614174000.jpg'

  // Define S3 upload parameters, including the folder path
  const params = {
    Bucket: 'gadupathi', 
    Key: `showCase_products/${desiredName}`, 
    Body: file.buffer,
    ContentType: file.mimetype,

  };

  try {
    // Create and send the PutObjectCommand to upload the file
    const command = new PutObjectCommand(params);
    await s3.send(command);

    // Construct the image URL based on your S3 bucket configuration
    const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    
    // Respond with the image URL
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ message: 'Error uploading file to S3.', error: error.message });
  }
});



router.post('/Gardening_plants', upload.array('image', 10), async (req, res) => {
  const files = req.files; // This will now contain an array of files

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  try {
    const imageUrls = [];

    // Loop through all files and upload them
    for (let file of files) {
      const fileExtension = file.originalname.split('.').pop();
      const desiredName = `${uuidv4()}.${fileExtension}`;
      const params = {
        Bucket: 'gadupathi',
        Key: `Gardening_plants/${desiredName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      // Add the uploaded image URL to the response array
      const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
      imageUrls.push(imageUrl);
    }

    res.status(200).json({ imageUrl: imageUrls }); // Return all uploaded image URLs
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ message: 'Error uploading files to S3.', error: error.message });
  }
});



module.exports = router;
