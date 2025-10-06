
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const dotenv = require("dotenv");


dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI ;


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  secretKeyHash: { type: String, required: true },
});

const vaultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User12", required: true },
  siteName: { type: String, required: true },
  link: String,
  password: { type: String, required: true }, // will be encrypted
  createdAt: { type: Date, default: Date.now },
});


const User = mongoose.model("User12", userSchema);
const VaultItem = mongoose.model("VaultItem", vaultSchema);


function hashSecretKey(secretKey) {
  return crypto.createHash("sha256").update(secretKey).digest("hex");
}


mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));


const algorithm = "aes-256-cbc";
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY || "default_key_please_change")
  .digest(); // 32 bytes

function encryptText(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plain, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // store as iv:encrypted
}

function decryptText(payload) {
  if (!payload) return "";
  const [ivHex, encrypted] = payload.split(":");
  if (!ivHex || !encrypted) return "";
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}


  app.post("/", async (req, res) => {
    const { name, email, password, secretKey } = req.body;
  
    // Validate fields
    if (!name || !email || !password || !secretKey) {
      return res.status(400).json({ error: "All fields are required" });
    }
  
    try {
      // Hash password and secret key
      const passwordHash = await bcrypt.hash(password, 10);
      const secretKeyHash = hashSecretKey(secretKey);
  
      // Save user to DB
      const user = await User.create({ name, email, passwordHash, secretKeyHash });
  
      res.status(201).json({
        message: "✅ User created successfully",
        userId: user._id,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Mongo duplicate key error (email already exists)
        return res.status(400).json({ error: "Email already exists" });
      }
      console.error("Signup Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.post("/save", async (req, res) => {
    const { userId, siteName, link, password } = req.body;
  
    if (!userId || !siteName || !password)
      return res.status(400).json({ error: "Required fields missing" });
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
  
      const encryptedPassword = encryptText(password);
  
      const newItem = new VaultItem({ userId, siteName, link, password: encryptedPassword });
      await newItem.save();
  
      res.json({ message: "Vault item saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save data" });
    }
  });
  
  
// Login
app.post("/login", async (req, res) => {
  const { email, password, secretKey } = req.body;
  if (!email || !password || !secretKey)
    return res.status(400).json({ error: "All fields required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid email/password" });

  if (!user.passwordHash) return res.status(500).json({ error: "User password missing" });

  const passMatch = await bcrypt.compare(password, user.passwordHash);
  const secretMatch = hashSecretKey(secretKey) === user.secretKeyHash;

  if (!passMatch || !secretMatch)
    return res.status(401).json({ error: "Invalid credentials" });

  res.json({ message: "Login successful", userId: user._id });
});

// Create Vault Item
app.post("/api/vault", async (req, res) => {
  const { userId, name, username, link, notes, password } = req.body;
  if (!userId || !name || !password)
    return res.status(400).json({ error: "Required fields missing" });

  try {
    const item = await VaultItem.create({ userId, name, username, link, notes, password });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Error creating vault item" });
  }
});


// Get Vault Items
// app.get("home/:userId", async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const items = await VaultItem.find({ userId });
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching vault items" });
//   }
// });
// app.get("/home/:userId", async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const items = await VaultItem.find({ userId }).sort({ createdAt: -1 });

//     // Decrypt passwords before sending
//     const decrypted = items.map(it => ({
//       ...it._doc,
//       password: decryptText(it.password), // <--- decrypted here
//     }));

//     res.json(decrypted);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error fetching vault items" });
//   }
// });







// Delete Vault Item
app.delete("/api/vault/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await VaultItem.findByIdAndDelete(id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting vault item" });
  }
});
// ✅ Get all vault items for a specific user
app.get("/vault/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const items = await VaultItem.find({ userId }).sort({ createdAt: -1 });

    if (!items || items.length === 0) return res.status(200).json([]);

    // ✅ Decrypt passwords
    const decryptedItems = items.map(item => ({
      ...item._doc,
      password: decryptText(item.password), // decrypt here
    }));

    res.status(200).json(decryptedItems); // send decrypted data
  } catch (err) {
    console.error("Error fetching vault items:", err);
    res.status(500).json({ error: "Error fetching vault items" });
  }
});





app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
