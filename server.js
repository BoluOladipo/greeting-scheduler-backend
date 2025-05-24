require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');


const app = express();

app.use(cors());
app.use(express.json());

// Serve PDFs in /templates folder statically
app.use('/api/templates/pdf', express.static(path.join(__dirname, 'templates')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');

    // Your existing API routes
    app.use('/api/celebrants', require('./routes/celebrants'));
    app.use('/api/templates', require('./routes/templates'));

    app.get('/api/stats', async (req, res) => {
      const Celebrant = require('./models/Celebrant');
      const Template = require('./models/templates');

      const [celebrants, templates] = await Promise.all([
        Celebrant.find(),
        Template.find()
      ]);

      const messagesSent = celebrants.filter(c => c.lastSent).length;

      res.json({
        totalCelebrants: celebrants.length,
        totalTemplates: templates.length,
        messagesSent
      });
    });

    app.get('/api/sent', async (req, res) => {
      const Celebrant = require('./models/Celebrant');
      try {
        const sentMessages = await Celebrant.find({ lastSent: { $ne: null } });
        res.json(sentMessages);
      } catch (err) {
        res.status(500).json({ error: 'Failed to load sent messages' });
      }
    });

    // New route to list PDF templates in the 'templates' folder
    app.get('/api/templates/pdf-list', (req, res) => {
      const templatesDir = path.join(__dirname, 'templates');
      fs.readdir(templatesDir, (err, files) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to read templates folder' });
        }
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        res.json(pdfFiles);
      });
    });

    // Load your scheduler after DB connection
    require('./scheduler/mailer');

    app.use((req, res, next) => {
      console.log(`Incoming: ${req.method} ${req.url}`);
      next();
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo Error:', err);
  });
