const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Celebrant = require('../models/Celebrant');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

// Map occasions to .docx template filenames
function getDocxTemplatePath(occasion) {
  const files = {
    'birthday': 'Birthday Message (1).docx',
    'anniversary': 'Anniversary Message (1).docx'
  };
  return files[occasion.toLowerCase()] || null;
}

// Run every minute
cron.schedule('* * * * *', async () => {
  const todayMMDD = new Date().toISOString().slice(5, 10);

  try {
    const celebrants = await Celebrant.find();

    for (const c of celebrants) {
      if (!c.date || isNaN(new Date(c.date))) {
        console.warn(`⚠️ Invalid or missing date for celebrant: ${c.name}`);
        continue;
      }

      const celebrantDate = new Date(c.date).toISOString().slice(5, 10);
      if (celebrantDate !== todayMMDD) continue;

      const alreadySentToday =
        c.lastSent && new Date(c.lastSent).toDateString() === new Date().toDateString();
      if (alreadySentToday) continue;

      // Get template file
      const docxFile = getDocxTemplatePath(c.occasion);
      if (!docxFile) {
        console.warn(`❌ No template found for ${c.occasion}`);
        continue;
      }

      const docxPath = path.join(__dirname, '..', 'templates', docxFile);

      // Compose HTML body depending on the occasion
let htmlBody;

if (c.occasion.toLowerCase() === 'birthday') {
  htmlBody = `
    <p>Dear ${c.name},</p>
    <i>
      <p><b>🎉 Happy Birthday! 🎉</b></p>
      <p>On this special day, the entire team celebrates you and the wonderful person you are. 🌟
      May this year be filled with joy, growth, and countless blessings. May you continue to inspire us with your dedication, creativity, and unwavering commitment to excellence. 🙏
      From all of us at Olam Agri, here’s to another year of achievements, shared victories, and memorable moments. 🥳 Cheers to you🥂 and do have a fun filled day today 🎉 Happy Birthday! 🎉🎈🎁</p>
      <p><b>Please find your greeting attached.</b></p>
      <p>Best Regards,<br/>Olam Agri Nigeria.</p>
    </i>
  `;
} else if (c.occasion.toLowerCase() === 'anniversary') {
  htmlBody = `
    <p>Dear ${c.name},</p>
    <i>

      <p><b><i>🎊 Happy Anniversary! 🎊<i></b></p>
 

<b><i>🎉 Happy Anniversary 🎉 </b></i>, Today marks the day you joined our global organization, and we couldn’t be more thrilled to have you on board. Your dedication, expertise, and commitment over the past  years have made a significant impact, and we look forward to many more successful years together.

As we celebrate this milestone with you, take a moment to reflect on your achievements and the valuable contributions you’ve made. Your hard work has not gone unnoticed, and we appreciate your unwavering commitment to our shared goals.

Thank you for being an integral part of our team. Here’s to another year of growth, teamwork, collaboration & success! Cheers to you 🥂.
</p>
      <p><b>Please find your greeting attached.</b></p>
      <p>Best Regards,<br/>Olam Agri Nigeria.</p>
    </i>
  `;
} else {
  htmlBody = `<p>Dear ${c.name},</p><p>Best wishes on your special day!</p>`;
}


      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: c.email,
          subject: `${c.occasion} Greetings`,
          html: htmlBody,
          attachments: [
            {
              filename: docxFile,
              path: docxPath,
              contentType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          ]
        });

        c.lastSent = new Date();
        await c.save();

        console.log(`✅ Email with message and .docx sent to ${c.name}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${c.name}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Scheduler error:', err);
  }
});

