const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");
const { itemSchema } = require("../utils/schema");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  console.log("🚀 Start create item");
  try {
    // 1. Parser data objects
    const body = JSON.parse(event.body);

    // 2. Validate Data
    const validation = itemSchema.safeParse(body);

    if (!validation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Validation Error",
          errors: validation.error.errors.map((err) => ({
            field: err.path[0],
            message: err.message,
          })),
        }),
      };
    }

    const { name, price, description } = validation.data;

    // 3. Created object to save
    const newItem = {
      id: crypto.randomUUID(),
      name,
      price,
      description: description || "No description provided",
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.ITEMS_TABLE,
        Item: newItem,
      }),
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Item created successfully",
        item: newItem,
      }),
    };
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error(error);
    return {
      statusCode: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
      }),
    };
  }
};
