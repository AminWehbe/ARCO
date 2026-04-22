// Express server entry point — mounts all routes and starts the server
require("dotenv").config();
const http    = require("http");
const express = require("express");
const cors    = require("cors");
const { Server } = require("socket.io");

const authRoutes   = require("./routes/auth");
const scoreRoutes  = require("./routes/scores");
const userRoutes   = require("./routes/users");
const adminRoutes  = require("./routes/admin");
const statsRoutes  = require("./routes/stats");
const attachSocket = require("./socket");

const app    = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://dmlg1bi4iczn7.cloudfront.net",
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/auth",   authRoutes);
app.use("/scores", scoreRoutes);
app.use("/users",  userRoutes);
app.use("/admin",  adminRoutes);
app.use("/stats",  statsRoutes);

// Attach socket.io with matching CORS
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});
attachSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ARCO server running on http://localhost:${PORT}`));
