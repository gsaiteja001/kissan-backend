// server/routes/upload.js
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
    accessKeyId: 'AKIAZQ3DQXGKAL3AK34A', // Use environment variables for better security
    secretAccessKey: '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',
  },
});

// Configure multer storage (memory storage for direct upload to S3)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const fileExtension = file.originalname.split('.').pop();


  const params = {
    Bucket: 'gadupathi',
    Key: `${Date.now().toString()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,

  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);

    const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ message: 'Error uploading file to S3.', error: error.message });
  }
});

module.exports = router;
