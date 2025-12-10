// server.js
// Full working backend with Supabase signed URLs + MySQL + file upload (memory->Supabase)

const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const util = require("util");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

// -------------------- SUPABASE CLIENT --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_BUCKET) {
  console.error("❌ Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_BUCKET in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------- APP INIT --------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads directory too (optional)
// If you don't store files locally, this doesn't hurt.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- MULTER (memory storage for Supabase) --------------------
const upload = multer({ storage: multer.memoryStorage() });

// -------------------- MYSQL POOL --------------------
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});
const query = util.promisify(db.query).bind(db);

db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err);
  } else {
    console.log("✅ MySQL Connected");
    conn.release();
  }
});

// -------------------- CREATE TABLES --------------------
const createTables = async () => {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      center_id INT,
      FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS loans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loanId VARCHAR(60) UNIQUE,
      memberCibil VARCHAR(20),
      personName VARCHAR(255),
      dateofbirth DATE,
      gender VARCHAR(20),
      religion VARCHAR(50),
      maritalStatus VARCHAR(50),
      aadharNo VARCHAR(20),
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
      address VARCHAR(255),
      pincode VARCHAR(10),
      loanAmount DECIMAL(12,2),
      duration INT,
      status VARCHAR(30) DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of stmts) {
    try {
      await query(sql);
    } catch (e) {
      console.error("❌ Table creation failed:", e);
    }
  }
};

createTables();

// -------------------- HELPERS --------------------
const generateLoanId = () => `LN-${Date.now()}`;

// uploadToSupabase returns the stored path inside bucket, e.g. "members/74/LN-.../file.png"
async function uploadToSupabase(buffer, original, folder) {
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(original)}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, buffer, { upsert: true });

  if (error) throw error;
  return filePath;
}

// Build public URL (only valid if bucket is public)
function supabasePublicUrl(filePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`;
}

// -------------------- AUTH ROUTES --------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const hash = await bcrypt.hash(password, 10);
    await query("INSERT INTO users (name, email, password) VALUES (?,?,?)", [name, email, hash]);

    res.json({ success: true, message: "Signup successful" });
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

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- CRUD ROUTES --------------------
app.post("/centers", async (req, res) => {
  try {
    const { name } = req.body;
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

// -------------------- LOAN FILES --------------------
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

// -------------------- SUBMIT LOAN --------------------
app.post(
  "/loans",
  upload.fields(FILE_FIELDS.map((f) => ({ name: f, maxCount: 1 })) ),
  async (req, res) => {
    try {
      const b = req.body;
      if (!b.memberId) return res.status(400).json({ message: "memberId required" });

      const member = await query("SELECT center_id FROM members WHERE id=?", [b.memberId]);
      if (!member.length) return res.status(400).json({ message: "Invalid Member" });

      const centerId = member[0].center_id;

      // Validate files
      for (const f of FILE_FIELDS) if (!req.files[f]) return res.status(400).json({ message: `${f} required` });

      const loanId = generateLoanId();
      const folder = `members/${b.memberId}/${loanId}`;

      const uploaded = {};
      for (const f of FILE_FIELDS) {
        const file = req.files[f][0];
        uploaded[f] = await uploadToSupabase(file.buffer, file.originalname, folder);
      }

      const sql = `
        INSERT INTO loans (
          loanId, memberCibil, personName, dateofbirth, gender, religion, maritalStatus,
          aadharNo, memberwork, annualIncome,
          memberId, centerId,
          memberAadhaarFront, memberAadhaarBack, nomineeAadhaarFront, nomineeAadhaarBack,
          panCard, formImage, signature, memberPhoto, passbookImage,
          nomineeName, nomineeDob, nomineeGender, nomineeReligion, nomineeMaritalStatus,
          nomineeRelationship, nomineeBusiness,
          mobileNo, nomineeMobile, memberEmail, address, pincode,
          loanAmount, duration
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      await query(sql, [
        loanId,
        b.memberCibil,
        b.personName,
        b.dateofbirth,
        b.gender,
        b.religion,
        b.maritalStatus,
        b.aadharNo,
        b.memberwork,
        b.annualIncome,
        b.memberId,
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
        b.nomineeName,
        b.nomineeDob,
        b.nomineeGender,
        b.nomineeReligion,
        b.nomineeMaritalStatus,
        b.nomineeRelationship,
        b.nomineeBusiness,
        b.mobileNo,
        b.nomineeMobile,
        b.memberEmail,
        b.address,
        b.pincode,
        b.loanAmount,
        b.duration
      ]);

      res.json({ success: true, loanId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// -------------------- GET LOANS --------------------
// Basic loans route returning DB rows (paths stored as bucket paths)
app.get("/loans", async (req, res) => {
  try {
    const data = await query(`
      SELECT l.*, m.name AS memberName, c.name AS centerName
      FROM loans l
      LEFT JOIN members m ON l.memberId = m.id
      LEFT JOIN centers c ON l.centerId = c.id
      ORDER BY l.id DESC
    `);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- GET LOANS WITH SIGNED URLS --------------------
app.get("/loans/signed", async (req, res) => {
  try {
    const rows = await query(`
      SELECT l.*, m.name AS memberName, c.name AS centerName
      FROM loans l
      LEFT JOIN members m ON l.memberId = m.id
      LEFT JOIN centers c ON l.centerId = c.id
      ORDER BY l.id DESC
    `);

    const result = await Promise.all(rows.map(async (row) => {
      const copy = { ...row };
      for (const f of FILE_FIELDS) {
        if (row[f]) {
          const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(row[f], 60 * 60);
          copy[f] = error ? null : data.signedUrl;
        } else copy[f] = null;
      }
      return copy;
    }));

    res.json(result);
  } catch (err) {
    console.error("Fetch loans with signed urls error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- SINGLE FILE SIGNED URL --------------------
app.get("/file/:encodedPath", async (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.encodedPath); // encoded path in URL
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(filePath, 60 * 60);
    if (error) {
      console.error("Signed URL error:", error);
      return res.status(500).json({ message: "Could not create signed url" });
    }
    res.json({ url: data.signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- DELETE LOAN --------------------
app.delete("/loan/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM loans WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const loan = rows[0];
    const paths = FILE_FIELDS.map((f) => loan[f]).filter(Boolean);

    if (paths.length) {
      await supabase.storage.from(SUPABASE_BUCKET).remove(paths);
    }

    await query("DELETE FROM loans WHERE id=?", [req.params.id]);
    res.json({ message: "Loan deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- CREATE USERS TABLE ----------------
const createUsersTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255)
      )
    `);
    console.log("✅ Users table ready");
  } catch (err) {
    console.error("❌ Users table error:", err);
  }
};

createUsersTable();

// ------------------- USERS CRUD API -------------------

// GET all users
app.get("/users", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ADD user
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name & Email required" });

    const result = await query("INSERT INTO users(name, email) VALUES(?, ?)", [name, email]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Insert user error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE user
app.delete("/users/:id", async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});


app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path; // bucket path
    const fileName = req.file.name;

    // Supabase PUBLIC URL create
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${filePath}`;

    res.json({
      success: true,
      url: publicUrl,   // <-- FRONTEND USE THIS
      path: filePath,
      name: fileName
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});


// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));
