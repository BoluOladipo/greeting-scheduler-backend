const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  type: { type: String, enum: ['Birthday', 'Anniversary'], unique: true },
  message: String
});

module.exports = mongoose.model('templates', templateSchema);
