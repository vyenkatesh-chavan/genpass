
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  username: String,
  link: String,
  notes: String,
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const VaultItem = mongoose.model("VaultItem", vaultSchema);


function hashSecretKey(secretKey) {
  return crypto.createHash("sha256").update(secretKey).digest("hex");
}


mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));


app.post("/api/signup", async (req, res) => {
  const { name, email, password, secretKey } = req.body;
  if (!name || !email || !password || !secretKey)
    return res.status(400).json({ error: "All fields required" });

  const passwordHash = await bcrypt.hash(password, 10);
  const secretKeyHash = hashSecretKey(secretKey);

  try {
    const user = await User.create({ name, email, passwordHash, secretKeyHash });
    res.json({ message: "User created", userId: user._id });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
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
app.get("/api/vault/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const items = await VaultItem.find({ userId });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Error fetching vault items" });
  }
});

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


app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
