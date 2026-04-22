// Public stats route — returns total users and global hi score, no auth required
const router = require("express").Router();
const { ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");

const USERS_TABLE  = "arco-users";
const SCORES_TABLE = "arco-scores";
const VALID_GAMES  = ["snake", "flappy", "memory", "battleship"];

// GET /stats — total registered users + global all-time high score
router.get("/", async (req, res) => {
  try {
    // Count all registered users
    const usersResult = await db.send(new ScanCommand({
      TableName: USERS_TABLE,
      Select: "COUNT",
    }));

    // Fetch top score per game via GSI, take the max across all games
    const topScores = await Promise.all(VALID_GAMES.map(gameId =>
      db.send(new QueryCommand({
        TableName: SCORES_TABLE,
        IndexName: "gameId-score-index",
        KeyConditionExpression: "gameId = :g",
        ExpressionAttributeValues: { ":g": gameId },
        ScanIndexForward: false,
        Limit: 1,
      })).then(r => r.Items?.[0]?.score ?? 0)
    ));

    res.json({
      totalUsers: usersResult.Count ?? 0,
      globalHi:   Math.max(...topScores),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
