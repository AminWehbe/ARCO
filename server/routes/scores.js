// Score routes — post a score (auth required), get leaderboard (public)
const router = require("express").Router();
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");
const requireAuth = require("../middleware/auth");

const TABLE = "arco-scores";
const VALID_GAMES = ["snake", "flappy", "memory", "battleship"];

// Save a score for the authenticated user
router.post("/", requireAuth, async (req, res) => {
  const { gameId, score } = req.body;
  if (!gameId || score === undefined) {
    return res.status(400).json({ error: "gameId and score are required" });
  }
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }

  const item = {
    gameId,
    sk: `${Date.now()}#${req.userId}`,
    userId: req.userId,
    username: req.username,
    score: Number(score),
    timestamp: new Date().toISOString(),
  };

  try {
    await db.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json({ message: "Score saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top 10 scores for a game (public)
router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }

  try {
    const result = await db.send(new QueryCommand({
      TableName: TABLE,
      IndexName: "gameId-score-index",
      KeyConditionExpression: "gameId = :g",
      ExpressionAttributeValues: { ":g": gameId },
      ScanIndexForward: false, // descending by score
      Limit: 10,
    }));
    res.status(200).json({ leaderboard: result.Items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
