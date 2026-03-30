import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import "dotenv/config";

const app = express();
const port = 3005;

// CORS - allow your Flutter app to connect
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Better Auth handles all /api/auth/* routes
// Express v5 uses {*any} instead of *
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

// Get current user session
app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
