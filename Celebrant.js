const mongoose = require('mongoose');

const celebrantSchema = new mongoose.Schema({
  name: String,
  email: String,
  occasion: String,
  date: Date,
  lastSent: Date
});

module.exports = mongoose.model('Celebrant', celebrantSchema);
