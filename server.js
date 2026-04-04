const express = require("express");
const cors = require("cors");
const path = require("path");
const recipes = require("./data/recipes");

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins so the React client can access the API
app.use(cors());

// Serve static files from /public (includes /images)
app.use(express.static(path.join(__dirname, "public")));

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

// ---------- Root — serve API docs page ----------

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`Meals on Mesa API running on http://localhost:${PORT}`);
});
