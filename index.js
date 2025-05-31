require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose Schemas
const userSchema = new mongoose.Schema({ username: String });
const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST /api/users - Create new user
app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// GET /api/users - List all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

// POST /api/users/:_id/exercises - Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);

  if (!user) return res.status(400).json({ error: "User not found" });

  const exerciseDate = date ? new Date(date) : new Date();
  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString(),
  });

  await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
  });
});

// GET /api/users/:_id/logs - Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);

  if (!user) return res.status(400).json({ error: "User not found" });

  let filter = { userId: user._id };
  let dateFilter = {};

  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (from || to) filter.date = dateFilter;

  let query = Exercise.find(filter);
  if (limit) query = query.limit(parseInt(limit));

  const exercises = await query.exec();

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date,
    })),
  });
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
