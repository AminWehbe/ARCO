// DynamoDB client — uses local endpoint in dev, real AWS in production
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const raw = new DynamoDBClient({
  region: process.env.AWS_REGION,
  ...(process.env.DYNAMO_ENDPOINT && {
    endpoint: process.env.DYNAMO_ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  }),
});

const db = DynamoDBDocumentClient.from(raw);

module.exports = db;
