/**
 * @fileoverview Lambda handler for creating new inventory items.
 * This function validates input using Zod, generates a unique ID,
 * and persists the item in Amazon DynamoDB.
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");
const { itemSchema } = require("../utils/schema");

// Initialize DynamoDB Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Creates a new item in the inventory system.
 * * @async
 * @param {Object} event - The AWS API Gateway Lambda Proxy Input.
 * @param {string} event.body - JSON string containing item details (name, price, category, description).
 * @returns {Promise<Object>} API Gateway Proxy Result with 201 (Created) or Error code.
 * * @example
 * Request Body: { "name": "SSD 1TB", "price": 120, "category": "electronics" }
 * Success Response: 201 { "message": "Item created successfully", "item": { ... } }
 */
module.exports.handler = async (event) => {
  try {
    /**
     * 1. Parse data objects
     * Convert the stringified body from the request into a JS Object.
     */
    const body = JSON.parse(event.body);

    /**
     * 2. Validate Data
     * Use Zod schema to enforce strict typing and required fields.
     */
    const validation = itemSchema.safeParse(body);

    if (!validation.success) {
      return sendResponse(400, {
        message: "Validation Error",
        errors: validation.error.format(),
      });
    }

    const { name, price, description, category } = validation.data;

    /**
     * 3. Construct persistent object
     * - id: UUID generated via crypto.
     * - createdAt: ISO 8601 timestamp.
     */
    const newItem = {
      id: crypto.randomUUID(),
      name,
      price,
      category,
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
    /**
     * Error Handling
     * Maps internal errors to HTTP standard status codes.
     */
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
