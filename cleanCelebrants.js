const mongoose = require('mongoose');
require('dotenv').config();

const Celebrant = require('./models/Celebrant');

async function clean() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const result = await Celebrant.deleteMany({
      $or: [
        { date: { $exists: false } },
        { date: null },
        { date: "" }
      ]
    });

    console.log('Deleted documents:', result.deletedCount);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clean();
