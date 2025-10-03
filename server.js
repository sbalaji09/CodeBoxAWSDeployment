const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  region: 'your-region', // e.g., 'us-west-1'
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // set in environment
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // set in environment
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Upload endpoint
const fs = require('fs');

const multer = require('multer');
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb) {
    cb(null, 'photo-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Read file buffer
  const fileContent = fs.readFileSync(req.file.path);

  // Set up S3 upload parameters
  const params = {
    Bucket: 'sbalaji-codebox-photos-2025',
    Key: req.file.filename, // File name you want to save as in S3
    Body: fileContent,
    ContentType: req.file.mimetype,
    ACL: 'public-read' // Optional: makes the file public
  };

  // Upload file to S3
  s3.upload(params, function(err, data) {
    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error uploading to S3' });
    }
    res.json({ message: 'File uploaded to S3 successfully', url: data.Location });
  });
});

// Get latest photo
app.get('/latest', (req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync('./uploads/');
  if (files.length === 0) {
    return res.json({ filename: null });
  }
  const latest = files.sort().reverse()[0];
  res.json({ filename: latest });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
