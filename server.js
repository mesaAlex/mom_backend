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
const { MONGODB_URI } = process.env;

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

// Connect to MongoDB and start the server only after a successful connection
const startServer = async () => {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing. Add it to your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const server = app.listen(PORT, () => {
      console.log(`Meals on Mesa API running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server or set a different PORT in .env.`);
      } else {
        console.error("Server startup error:", err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  }
};

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  tags: { type: [String], required: true },
  prepMinutes: { type: Number, required: true },
  cookMinutes: { type: Number, required: true },
  servings: { type: Number, required: true },
  calories: { type: Number, required: true },
  ingredients: { type: [String], required: true },
  instructions: { type: [String], required: true },
});

const Recipe = mongoose.model("Recipe", recipeSchema);


// ---------- API Routes ----------

// GET /api/recipes — return full recipe list
app.get("/api/recipes", async (_req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// GET /api/recipes/:id — return a single recipe by id
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

// POST /api/recipes — add a new recipe
app.post("/api/recipes", upload.single("img"), async (req, res) => {
  try {
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

    const { error } = validateRecipe(body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const recipe = new Recipe({
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
    });

    const newRecipe = await recipe.save();
    res.status(201).json(newRecipe);
  } catch (err) {
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

// PUT /api/recipes/:id — update an existing recipe
app.put("/api/recipes/:id", upload.single("img"), async (req, res) => {
  try {
    const existing = await Recipe.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Recipe not found" });

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

    const { error } = validateRecipe(body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const fieldsToUpdate = {
      title: body.title,
      description: body.description,
      image: req.file ? `/images/${req.file.filename}` : existing.image,
      tags: body.tags,
      prepMinutes: body.prepMinutes,
      cookMinutes: body.cookMinutes,
      servings: body.servings,
      calories: body.calories,
      ingredients: body.ingredients,
      instructions: body.instructions,
    };

    const updated = await Recipe.findByIdAndUpdate(req.params.id, fieldsToUpdate, { returnDocument: "after" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update recipe" });
  }
});

// DELETE /api/recipes/:id — remove a recipe
app.delete("/api/recipes/:id", async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Recipe not found" });
    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

const validateRecipe = (recipe) => {
  const schema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(5).required(),
    image: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).min(1).required(),
    prepMinutes: Joi.number().min(0).required(),
    cookMinutes: Joi.number().min(0).required(),
    servings: Joi.number().min(1).required(),
    calories: Joi.number().min(0).required(),
    ingredients: Joi.array().items(Joi.string()).min(1).required(),
    instructions: Joi.array().items(Joi.string()).min(1).required(),
  });

  return schema.validate(recipe, { allowUnknown: false, stripUnknown: true });
};

// ---------- Root — serve API docs page ----------

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Start server ----------

startServer();
