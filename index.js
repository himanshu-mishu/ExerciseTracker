const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// === Mongoose Models ===
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

// === Routes ===

// Create new user
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "_id username");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      userId,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: Number(savedExercise.duration),
      description: savedExercise.description,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to add exercise" });
  }
});

// Get user logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    let filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select("description duration date -_id");
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();
    const log = exercises.map((e) => ({
      description: e.description,
      duration: Number(e.duration),
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get logs" });
  }
});

// === Start Server ===
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
