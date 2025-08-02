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

// 🔐 LOGIN WITH DEBUG LOGGING
app.get('/api/verify-broker', async (req, res) => {
  const email = req.query.email;
  const password = req.query.password;

  console.log("==> ///////////////////////////////////////////////////////////");
  console.log("==> LOGIN ATTEMPT:");
  console.log("Email:", email);
  console.log("Password:", password);

  if (!email || !password) {
    console.log("❌ Missing email or password in request");
    return res.status(400).json({ error: "Missing email or password" });
  }

  const formula = `AND(
    LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
    TRIM({Password}) = '${password.trim()}'
  )`;

  console.log("Airtable filter formula:", formula);

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: formula,
      maxRecords: 1
    }).firstPage();

    console.log("🔍 Matching records:", records.length);

    if (!records.length) {
      console.log("❌ No matching records found.");
      return res.status(403).json({ error: "Invalid login credentials" });
    }

    const brokerName = records[0].fields["Broker First Name"] || "Broker";
    console.log("✅ Broker authenticated:", brokerName);
    return res.json({ brokerName });

  } catch (err) {
    console.error("❌ Login server error:", err);
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

// 🔐 RESET PASSWORD WITH TEMP PASSWORD (with debug logs)
// 🔐 RESET PASSWORD WITH TEMP PASSWORD
app.post('/api/reset-password', async (req, res) => {
  const { email, tempPassword, newPassword } = req.body;

  console.log("==> Reset password request:");
  console.log("Email:", email);
  console.log("Temp Password:", tempPassword);
  console.log("New Password:", newPassword);

  if (!email || !tempPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(
        LOWER(TRIM({Email})) = LOWER('${email.trim()}'),
        TRIM({Password}) = '${tempPassword.trim()}'
      )`,
      maxRecords: 1
    }).firstPage();

    console.log("🔍 Matching records:", records.length);

    if (!records.length) {
      return res.status(403).json({ error: "Temporary password incorrect or expired" });
    }

    const recordId = records[0].id;
    const brokerName = records[0].fields["Broker First Name"] || "Broker";

    await base(process.env.AIRTABLE_BROKER_TABLE).update(recordId, {
      "Password": newPassword
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
