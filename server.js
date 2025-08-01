require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname))); // Serves index.html and other static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE);

const stageMap = {
  "Census Received": 0,
  "Processing": 1,
  "Engaging Carriers": 2,
  "Preparing Quote": 3,
  "Quote Returned": 4
};

// 🔐 LOGIN USING EMAIL + PASSWORD
app.get('/api/verify-broker', async (req, res) => {
  const email = req.query.email;
  const password = req.query.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(
        LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
        TRIM({Password}) = '${password.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      return res.status(403).json({ error: "Invalid login credentials" });
    }

    // ✅ Use "Broker First Name" instead of "Username"
    const brokerName = records[0].fields["Broker First Name"] || "Broker";
    return res.json({ brokerName });

  } catch (err) {
    console.error("❌ Broker verification failed:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// 📦 FETCH TRACKED RFPs
app.get('/api/projects', async (req, res) => {
  const brokerName = req.query.broker;
  if (!brokerName) return res.status(400).json({ error: "Missing broker name" });

  try {
    const records = await base(process.env.AIRTABLE_TABLE).select({
      filterByFormula: `{Broker First Name} = '${brokerName}'`
    }).all();

    const results = records
      .filter(r => r.fields["Stage"] && r.fields["RFP Name"])
      .map(record => ({
        projectName: record.fields["RFP Name"],
        stage: record.fields["Stage"],
        stageIndex: stageMap[record.fields["Stage"]],
        timeRemaining: record.fields["Time Remaining"] || "N/A",
        submissionTime: record.fields["created"] || null
      }));

    res.json(results);
  } catch (err) {
    console.error("❌ Airtable query failed:", err);
    res.status(500).json({ error: "Airtable query failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// 🔐 UPDATE PASSWORD
app.post('/api/update-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(
        LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
        TRIM({Password}) = '${currentPassword.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      return res.status(403).json({ error: "Current password incorrect" });
    }

    const recordId = records[0].id;

    await base(process.env.AIRTABLE_BROKER_TABLE).update(recordId, {
      "Password": newPassword
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating password:", err);
    res.status(500).json({ error: "Server error" });
  }
});
