const express = require('express');
const router = express.Router();
const Celebrant = require('../models/Celebrant');

const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' }); // Temp folder

// CREATE single celebrant
router.post('/', async (req, res) => {
  const { name, email, occasion, date } = req.body;

  if (!name || !email || !occasion || !date) {
    return res.status(400).json({ error: 'All fields including date are required' });
  }

  if (isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const celebrant = new Celebrant({ name, email, occasion, date });
    await celebrant.save();
    res.json(celebrant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save celebrant' });
  }
});

// BULK UPLOAD via JSON
router.post('/bulk-upload', async (req, res) => {
  const celebrants = req.body.celebrants;

  if (!Array.isArray(celebrants) || celebrants.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty celebrants array' });
  }

  for (let i = 0; i < celebrants.length; i++) {
    const c = celebrants[i];
    if (!c.name || !c.email || !c.occasion || !c.date) {
      return res.status(400).json({ error: `Missing fields for celebrant at index ${i}` });
    }
    if (isNaN(new Date(c.date).getTime())) {
      return res.status(400).json({ error: `Invalid date format for celebrant at index ${i}` });
    }
  }

  try {
    const result = await Celebrant.insertMany(celebrants);
    res.status(201).json({ message: `${result.length} celebrants added successfully.`, celebrants: result });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to upload celebrants' });
  }
});

// BULK UPLOAD via FILE (CSV, XLSX, DOCX, PDF)
router.post('/bulk-upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const celebrants = await parseFile(filePath, originalName);

    fs.unlinkSync(filePath); // Clean up

    if (!Array.isArray(celebrants) || celebrants.length === 0) {
      return res.status(400).json({ error: 'No celebrants found in file' });
    }

    for (let i = 0; i < celebrants.length; i++) {
      const c = celebrants[i];
      if (!c.name || !c.email || !c.occasion || !c.date) {
        return res.status(400).json({ error: `Missing fields at line ${i + 1}` });
      }
      if (isNaN(new Date(c.date).getTime())) {
        return res.status(400).json({ error: `Invalid date at line ${i + 1}` });
      }
    }

    const result = await Celebrant.insertMany(celebrants);
    res.status(201).json({ message: `${result.length} celebrants uploaded successfully.` });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload celebrants' });
  }
});

// READ all celebrants
router.get('/', async (req, res) => {
  try {
    const celebrants = await Celebrant.find();
    res.json(celebrants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch celebrants' });
  }
});

// DELETE celebrant
router.delete('/:id', async (req, res) => {
  try {
    const result = await Celebrant.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Celebrant not found' });
    }
    res.json({ message: 'Celebrant deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Helper: parse uploaded files
async function parseFile(filePath, originalName) {
  const ext = originalName.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet,{raw: false});
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return parseTextToCelebrants(result.value);
  }

  if (ext === 'pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await pdfParse(dataBuffer);
    return parseTextToCelebrants(result.text);
  }

  throw new Error('Unsupported file type');
}

// Helper: convert raw text to celebrant objects
function parseTextToCelebrants(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const [name, email, occasion, date] = line.split(',').map(s => s.trim());
    return { name, email, occasion, date };
  });
}
