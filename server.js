const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Configure multer for file upload
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

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ filename: req.file.filename });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
