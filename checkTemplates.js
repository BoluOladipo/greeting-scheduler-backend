const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'templates');

function listPdfTemplates() {
  try {
    const files = fs.readdirSync(templatesDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    return pdfFiles;
  } catch (err) {
    console.error('Error reading templates directory:', err);
    return [];
  }
}

const templates = listPdfTemplates();
console.log('Available PDF templates:', templates);
