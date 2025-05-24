const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'models', 'Celebrant.js');
console.log("Looking for:", filePath);

if (fs.existsSync(filePath)) {
  console.log("✅ File exists.");
} else {
  console.log("❌ File NOT found.");
}
