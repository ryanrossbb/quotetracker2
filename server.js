require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

console.log("🔥 server.js started");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname))); // Serve static files like index.html
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' }); // save uploaded files temporarily

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE);

const stageMap = {
  "Census Received": 0,
  "Processing": 1,
  "Engaging Carriers": 2,
  "Preparing Quote": 3,
  "Quote Returned": 4
};

// ✅ LOGIN ROUTE
app.get('/api/verify-broker', async (req, res) => {
  const email = req.query.email;
  const password = req.query.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  console.log("Received login:", { email });

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(
        LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
        TRIM({Password}) = '${password.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      return res.status(403).json({ error: "Invalid email or password" });
    }

    const brokerName = records[0].fields["Username"] || records[0].fields["Name"] || email;
    return res.json({ brokerName });

  } catch (err) {
    console.error("❌ Broker verification failed:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ✅ GET PROJECTS
app.get('/api/projects', async (req, res) => {
  const brokerName = req.query.broker;
  if (!brokerName) return res.status(400).json({ error: "Missing Username" });

  try {
    const records = await base(process.env.AIRTABLE_TABLE).select({
      filterByFormula: `{Username} = '${brokerName}'`
    }).all();

    console.log("Returned fields:");
    records.forEach(record => {
      console.log(record.fields);
    });

    const results = records
      .filter(r => r.fields["Stage"] && r.fields["RFP Name"])
      .map(record => ({
        projectName: record.fields["RFP Name"],
        stage: record.fields["Stage"],
        stageIndex: stageMap[record.fields["Stage"]],
        timeRemaining: record.fields["Time Remaining"] || "N/A",
        submissionTime: record.fields["created"] || null,
        livesSubmitted: record.fields["Group Size"] || null
      }));

    res.json(results);

  } catch (err) {
    console.error("❌ Airtable query failed:", err);
    res.status(500).json({ error: "Airtable query failed" });
  }
});

// ✅ UPLOAD RFP
app.post('/api/upload-rfp', upload.single('file'), async (req, res) => {
  const { username, groupName } = req.body;
  const file = req.file;

  if (!username || !groupName || !file) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // You can replace this with real file hosting later (e.g., S3 or Cloudinary)
    const record = await base(process.env.AIRTABLE_TABLE).create({
      "Username": username,
      "RFP Name": groupName,
      "Stage": "Census Received",
      "Time Remaining": "TBD",
      "File Upload": [
        {
          url: `https://yourdomain.com/uploads/${file.filename}`,
          filename: file.originalname
        }
      ]
    });

    res.json({ success: true, recordId: record.id });

  } catch (err) {
    console.error("❌ Error uploading RFP:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
