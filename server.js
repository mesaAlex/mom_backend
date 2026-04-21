require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const Joi = require("joi");
const multer = require("multer");
const recipes = require("./data/recipes");

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins so the React client can access the API
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static files from /public (includes /images)
app.use(express.static(path.join(__dirname, "public")));

// Multer storage config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to mongodb..."))
  .catch((err) => console.error("could not connect ot mongodb...", err));

// ---------- API Routes ----------

// GET /api/recipes — return full recipe list
app.get("/api/recipes", (_req, res) => {
  res.json(recipes);
});

// GET /api/recipes/:id — return a single recipe by id
app.get("/api/recipes/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  res.json(recipe);
});

// POST /api/recipes — add a new recipe
app.post("/api/recipes", upload.single("img"), (req, res) => {
  // Parse array fields sent as JSON strings from FormData
  const body = {
    ...req.body,
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    ingredients: req.body.ingredients ? JSON.parse(req.body.ingredients) : [],
    instructions: req.body.instructions ? JSON.parse(req.body.instructions) : [],
    prepMinutes: Number(req.body.prepMinutes),
    cookMinutes: Number(req.body.cookMinutes),
    servings: Number(req.body.servings),
    calories: Number(req.body.calories),
  };

  const result = validateRecipe(body);

  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }

  const recipe = {
    id: recipes.length + 1,
    title: body.title,
    description: body.description,
    image: req.file ? `/images/${req.file.filename}` : "/images/salmon_salad.png",
    tags: body.tags,
    prepMinutes: body.prepMinutes,
    cookMinutes: body.cookMinutes,
    servings: body.servings,
    calories: body.calories,
    ingredients: body.ingredients,
    instructions: body.instructions,
  };

  recipes.push(recipe);
  res.status(200).send(recipe);
});

// PUT /api/recipes/:id — update an existing recipe
app.put("/api/recipes/:id", upload.single("img"), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = recipes.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  const body = {
    ...req.body,
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    ingredients: req.body.ingredients ? JSON.parse(req.body.ingredients) : [],
    instructions: req.body.instructions ? JSON.parse(req.body.instructions) : [],
    prepMinutes: Number(req.body.prepMinutes),
    cookMinutes: Number(req.body.cookMinutes),
    servings: Number(req.body.servings),
    calories: Number(req.body.calories),
  };

  const result = validateRecipe(body);

  if (result.error) {
    return res.status(400).send(result.error.details[0].message);
  }

  const updatedRecipe = {
    id: id,
    title: body.title,
    description: body.description,
    image: req.file ? `/images/${req.file.filename}` : recipes[index].image,
    tags: body.tags,
    prepMinutes: body.prepMinutes,
    cookMinutes: body.cookMinutes,
    servings: body.servings,
    calories: body.calories,
    ingredients: body.ingredients,
    instructions: body.instructions,
  };

  recipes[index] = updatedRecipe;
  res.status(200).json(updatedRecipe);
});

// DELETE /api/recipes/:id — remove a recipe
app.delete("/api/recipes/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = recipes.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  recipes.splice(index, 1);
  res.status(200).json({ message: "Recipe deleted successfully" });
});

const validateRecipe = (recipe) => {
  const schema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(5).required(),
    tags: Joi.array().items(Joi.string()).min(1).required(),
    prepMinutes: Joi.number().min(0).required(),
    cookMinutes: Joi.number().min(0).required(),
    servings: Joi.number().min(1).required(),
    calories: Joi.number().min(0).required(),
    ingredients: Joi.array().items(Joi.string()).min(1).required(),
    instructions: Joi.array().items(Joi.string()).min(1).required(),
  });

  return schema.validate(recipe);
};

// ---------- Root — serve API docs page ----------

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`Meals on Mesa API running on http://localhost:${PORT}`);
});
