// server.js
// MySQL + Supabase (uploads in memory -> supabase.storage) + signed URL endpoints

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const util = require('util');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// ---- App init ----
const app = express();

// ---- Middleware ----
app.use(cors({ origin: 'http://localhost:8082' })); // frontend URL
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // optional local folder

// ---- Supabase setup ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_BUCKET) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_BUCKET must be set in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- Multer in-memory storage ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// ---- MySQL pool ----
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "mfi",
  port: process.env.DB_PORT || 3306,
});

const query = util.promisify(db.query).bind(db);

db.getConnection((err, conn) => {
  if (err) console.error("❌ MySQL connection failed:", err);
  else {
    console.log("✅ MySQL connected");
    conn.release();
  }
});

// ---- Auto-create tables ----
const createTables = async () => {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      center_id INT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS loans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loanId VARCHAR(80) UNIQUE,
      memberCibil VARCHAR(20),
      personName VARCHAR(255),
      dateofbirth DATE,
      gender VARCHAR(20),
      religion VARCHAR(50),
      maritalStatus VARCHAR(50),
      aadharNo VARCHAR(50),
      memberwork VARCHAR(255),
      annualIncome DECIMAL(12,2),
      memberId INT,
      centerId INT,
      memberAadhaarFront VARCHAR(255),
      memberAadhaarBack VARCHAR(255),
      nomineeAadhaarFront VARCHAR(255),
      nomineeAadhaarBack VARCHAR(255),
      panCard VARCHAR(255),
      formImage VARCHAR(255),
      signature VARCHAR(255),
      memberPhoto VARCHAR(255),
      passbookImage VARCHAR(255),
      nomineeName VARCHAR(255),
      nomineeDob DATE,
      nomineeGender VARCHAR(20),
      nomineeReligion VARCHAR(50),
      nomineeMaritalStatus VARCHAR(50),
      nomineeRelationship VARCHAR(50),
      nomineeBusiness VARCHAR(255),
      mobileNo VARCHAR(20),
      nomineeMobile VARCHAR(20),
      memberEmail VARCHAR(255),
      address VARCHAR(512),
      pincode VARCHAR(10),
      status VARCHAR(30) DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE SET NULL,
      FOREIGN KEY (centerId) REFERENCES centers(id) ON DELETE SET NULL
    )`
  ];

  for (const s of stmts) {
    try { await query(s); } 
    catch (e) { console.error("Table creation error:", e); }
  }
};

createTables();

// ---- Helpers ----
const generateLoanId = () => `LN-${Date.now()}`;

async function uploadToSupabase(buffer, originalName, folder) {
  const ext = path.extname(originalName) || "";
  const basename = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fileName = `${basename}${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, buffer, { upsert: true });
  if (error) throw new Error(`Supabase upload failed: ${JSON.stringify(error)}`);
  return filePath;
}

function getContentTypeForPath(p) {
  if (!p) return "application/octet-stream";
  if (/\.(jpg|jpeg)$/i.test(p)) return "image/jpeg";
  if (/\.(png)$/i.test(p)) return "image/png";
  if (/\.(gif)$/i.test(p)) return "image/gif";
  if (/\.(pdf)$/i.test(p)) return "application/pdf";
  return "application/octet-stream";
}

// ---- Routes: Auth (basic) ----
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const hash = await bcrypt.hash(password, 10);
    const r = await query("INSERT INTO users (name, email, password) VALUES (?,?,?)", [name, email, hash]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await query("SELECT * FROM users WHERE email=?", [email]);
    if (!rows.length) return res.status(400).json({ message: "Invalid email" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Centers / Members CRUD ----
app.post("/centers", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    const r = await query("INSERT INTO centers(name) VALUES(?)", [name]);
    res.json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/centers", async (req, res) => {
  try {
    const data = await query("SELECT * FROM centers");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/members", async (req, res) => {
  try {
    const { name, center_id } = req.body;
    if (!name || !center_id) return res.status(400).json({ message: "Name & center_id required" });
    const r = await query("INSERT INTO members(name, center_id) VALUES(?,?)", [name, center_id]);
    res.json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/members/:centerId", async (req, res) => {
  try {
    const data = await query("SELECT * FROM members WHERE center_id=?", [req.params.centerId]);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- FILE FIELDS list used in form and DB ----
const FILE_FIELDS = [
  "memberAadhaarFront",
  "memberAadhaarBack",
  "nomineeAadhaarFront",
  "nomineeAadhaarBack",
  "panCard",
  "formImage",
  "signature",
  "memberPhoto",
  "passbookImage"
];

// ---- Submit loan (multipart) ----
app.post("/loans", upload.fields(FILE_FIELDS.map(f => ({ name: f, maxCount: 1 }))), async (req, res) => {
  try {
    const body = req.body;
    if (!body.memberId) return res.status(400).json({ message: "memberId required" });

    // verify member exists and get center
    const memberRows = await query("SELECT center_id FROM members WHERE id=?", [body.memberId]);
    if (!memberRows.length) return res.status(400).json({ message: "Invalid member" });
    const centerId = memberRows[0].center_id;

    // ensure files exist - (adjust if you want optional files)
    for (const f of FILE_FIELDS) {
      if (!req.files || !req.files[f]) return res.status(400).json({ message: `${f} required` });
    }

    const loanId = generateLoanId();
    const folder = `members/${body.memberId}/${loanId}`;

    const uploaded = {};
    for (const f of FILE_FIELDS) {
      const file = req.files[f][0];
      uploaded[f] = await uploadToSupabase(file.buffer, file.originalname, folder);
    }

    // Insert loan row with stored paths (these are bucket paths)
    const sql = `
INSERT INTO loans (
  loanId, memberCibil, personName, dateofbirth, gender, religion, maritalStatus,
  aadharNo, memberwork, annualIncome, memberId, centerId,
  memberAadhaarFront, memberAadhaarBack, nomineeAadhaarFront, nomineeAadhaarBack,
  panCard, formImage, signature, memberPhoto, passbookImage,
  nomineeName, nomineeDob, nomineeGender, nomineeReligion, nomineeMaritalStatus,
  nomineeRelationship, nomineeBusiness,
  mobileNo, nomineeMobile, memberEmail, address, pincode
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    await query(sql, [
      loanId,
      body.memberCibil,
      body.personName,
      body.dateofbirth || null,
      body.gender,
      body.religion,
      body.maritalStatus,
      body.aadharNo,
      body.memberwork,
      body.annualIncome || null,
      body.memberId,
      centerId,
      uploaded.memberAadhaarFront,
      uploaded.memberAadhaarBack,
      uploaded.nomineeAadhaarFront,
      uploaded.nomineeAadhaarBack,
      uploaded.panCard,
      uploaded.formImage,
      uploaded.signature,
      uploaded.memberPhoto,
      uploaded.passbookImage,
      body.nomineeName,
      body.nomineeDob || null,
      body.nomineeGender,
      body.nomineeReligion,
      body.nomineeMaritalStatus,
      body.nomineeRelationship,
      body.nomineeBusiness,
      body.mobileNo,
      body.nomineeMobile,
      body.memberEmail,
      body.address,
      body.pincode
    ]);

    res.json({ success: true, loanId });
  } catch (err) {
    console.error("Submit loan error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Get loans (DB rows; paths stored are bucket keys) ----
app.get("/loans", async (req, res) => {
  try {
    const rows = await query(`
      SELECT l.*, m.name AS memberName, c.name AS centerName
      FROM loans l
      LEFT JOIN members m ON l.memberId = m.id
      LEFT JOIN centers c ON l.centerId = c.id
      ORDER BY l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Single file signed URL endpoint (param based) ----
// GET /get-signed-url/:filePath  (filePath should be url-encoded)
app.get("/get-signed-url/:filePath", async (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.filePath);
    if (!filePath) return res.status(400).json({ success: false, message: "filePath required" });

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      console.error("Signed URL Error:", error);
      return res.status(400).json({ success: false, message: "Signed URL error", error });
    }

    res.json({ success: true, url: data.signedUrl });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ---- Single file signed URL endpoint (query param) ----
// GET /file/url?path=members%2F74%2FLN-...%2Ffile.png
app.get("/file/url", async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ message: "path query required" });

    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(filePath, 60 * 60);
    if (error) {
      console.error("Signed URL error:", error);
      return res.status(500).json({ message: "Could not create signed url" });
    }
    res.json({ url: data.signedUrl });
  } catch (err) {
    console.error("file/url error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Download file via server and stream to client (for browsers that need proxied file) ----
// GET /file?path=members/74/LN-.../file.png
app.get("/file", async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send("path required");

    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(filePath);
    if (error) {
      console.error("Supabase download error:", error);
      return res.status(404).send("File not found");
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader("Content-Type", getContentTypeForPath(filePath));
    res.send(buffer);
  } catch (err) {
    console.error("file download error:", err);
    res.status(500).send("Server error");
  }
});

// ---- Get loans with signed URLs for each file field (TTL 1 hour) ----
app.get("/loans/signed", async (req, res) => {
  try {
    const rows = await query(`
      SELECT l.*, m.name AS memberName, c.name AS centerName
      FROM loans l
      LEFT JOIN members m ON l.memberId = m.id
      LEFT JOIN centers c ON l.centerId = c.id
      ORDER BY l.id DESC
    `);

    const mapped = await Promise.all(rows.map(async row => {
      const copy = { ...row };
      for (const f of FILE_FIELDS) {
        if (row[f]) {
          try {
            const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(row[f], 60 * 60);
            copy[f] = error ? null : data.signedUrl;
          } catch (e) {
            console.warn("Signed url creation failed for", row[f], e);
            copy[f] = null;
          }
        } else {
          copy[f] = null;
        }
      }
      return copy;
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Fetch loans with signed urls error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Delete loan (also remove files from bucket) ----
app.delete("/loan/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM loans WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const loan = rows[0];
    const paths = FILE_FIELDS.map(f => loan[f]).filter(Boolean);

    if (paths.length) {
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(paths);
      if (error) console.warn("Supabase remove warning:", error);
    }

    await query("DELETE FROM loans WHERE id=?", [req.params.id]);
    res.json({ message: "Loan deleted" });
  } catch (err) {
    console.error("Delete loan error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Users CRUD (simple) ----
app.get("/users", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name & Email required" });
    const r = await query("INSERT INTO users(name, email) VALUES(?,?)", [name, email]);
    res.json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---- Simple direct upload endpoint (helper) ----
// accepts form-data: { folder: "members/74/LN-xxxx", file: <file> }
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const folder = req.body.folder; // example: members/74/LN-xxxx
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const filename = Date.now() + "_" + file.originalname;

    // UPLOAD TO SUPABASE STORAGE
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(`${folder}/${filename}`, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.log("Upload error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }

    // GET PUBLIC URL (works if bucket is public)
    const { data } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(`${folder}/${filename}`);

    return res.json({
      success: true,
      url: data.publicUrl, // 👉 DIRECT LINK FOR IMAGE VIEW (if bucket public)
      path: `${folder}/${filename}`,
    });
  } catch (err) {
    console.log("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- ADD LOAN WITH PHOTO (simple helper) --------------------
app.post("/loans/add", upload.single("photo"), async (req, res) => {
  try {
    const { customer_name, phone, amount } = req.body;

    let imagePath = null;

    // Upload image to Supabase
    if (req.file) {
      const fileName = `loans/${Date.now()}-${req.file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        return res.status(400).json({ success: false, error: uploadError });
      }

      imagePath = fileName;
    }

    // Insert loan into DB
    const r = await query(
      "INSERT INTO loans (personName, mobileNo, annualIncome, memberEmail, memberId, centerId, memberPhoto) VALUES (?,?,?,?,?,?,?)",
      [customer_name, phone, amount || 0, null, null, null, imagePath]
    );

    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- GET ALL LOANS WITH SIGNED IMAGE (compat /loans/list) --------------------
app.get("/loans/list", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM loans ORDER BY id DESC");
    const finalData = [];

    for (const loan of rows) {
      let signedUrl = null;
      if (loan.memberPhoto) {
        const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET).createSignedUrl(loan.memberPhoto, 60 * 60);
        signedUrl = data?.signedUrl || null;
      }
      finalData.push({ ...loan, image_url: signedUrl });
    }

    res.json({ success: true, loans: finalData });
  } catch (err) {
    console.error("loans/list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/loan/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status required" });

    await query("UPDATE loans SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    handleServerError(res, err);
  }
});
app.get('/', (req, res) => res.send('Backend is working!'));

// ---- Start server ----
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
