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
  "Quote Returned": 4,
  "Sold": 5
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
        TRIM({unique Login}) = '${password.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      console.log("❌ No matching broker record found for:", email);
      return res.status(403).json({ error: "Invalid email or password" });
    }

    console.log("✅ Broker record fields:", JSON.stringify(records[0].fields));
    const brokerName = records[0].fields["Broker Name"]?.trim() || records[0].fields["Brokerage Name"] || "Broker";
    console.log("✅ Returning brokerName:", brokerName);
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
        livesSubmitted: record.fields["Group Size"] ?? null
      }));

    res.json(results);

  } catch (err) {
    console.error("❌ Airtable query failed:", err);
    res.status(500).json({ error: "Airtable query failed" });
  }
});

// 🔐 RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
  const { email, tempPassword, newPassword } = req.body;

  console.log("==> Reset password request for:", email);

  if (!email || !tempPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(
        LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
        TRIM({unique Login}) = '${tempPassword.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      return res.status(403).json({ error: "Temporary password incorrect or expired" });
    }

    const recordId   = records[0].id;
    const brokerName = records[0].fields["Broker Name"]?.trim() || records[0].fields["Brokerage Name"] || "Broker";

    await base(process.env.AIRTABLE_BROKER_TABLE).update(recordId, {
      "unique Login": newPassword
    });

    console.log("✅ Password updated for:", brokerName);
    res.json({ success: true, brokerName });

  } catch (err) {
    console.error("❌ Error resetting password:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
