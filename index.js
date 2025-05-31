const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({ username: String });
const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create new user
app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date(),
  });

  await exercise.save();
  res.json({
    _id: user._id,
    username: user.username,
    date: exercise.date.toDateString(),
    duration: exercise.duration,
    description: exercise.description,
  });
});

// Get logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  let query = { userId: user._id };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  let exercises = Exercise.find(query).select("description duration date");
  if (limit) exercises = exercises.limit(parseInt(limit));

  const logs = (await exercises).map((ex) => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString(),
  }));

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log: logs,
  });
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
