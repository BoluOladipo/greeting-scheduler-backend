const express = require('express');
const router = express.Router();
const Template = require('../models/templates');

router.post('/', async (req, res) => {
  const { type, message } = req.body;
  await Template.findOneAndUpdate({ type }, { message }, { upsert: true, new: true });
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  const templates = await Template.find();
  res.json(templates);
});

module.exports = router;
