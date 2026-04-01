/**
 * @fileoverview Lambda handler to retrieve a single inventory item by its unique ID.
 * Implements strict error handling for non-existent records to ensure API reliability.
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetches a specific item from the DynamoDB table using its Partition Key (id).
 * * @async
 * @param {Object} event - The AWS API Gateway Lambda Proxy Input.
 * @param {Object} event.pathParameters - Contains the route parameters.
 * @param {string} event.pathParameters.id - The unique identifier (UUID) of the item.
 * @returns {Promise<Object>} 200 OK with the item data, or 404 if not found.
 * * @example
 * Path: /items/550e8400-e29b-41d4-a716-446655440000
 * Success Response: 200 { "id": "...", "name": "...", "price": 100 }
 * Error Response: 404 { "message": "Item with id ... not found" }
 */
module.exports.handler = async (event) => {
  try {
    /**
     * 1. Extract Identity
     * The ID is retrieved from the URL path defined in serverless.yml (e.g., /items/{id}).
     */
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { id },
    };

    /**
     * 2. Database Retrieval
     * Using GetCommand for high-speed, direct key access (O(1)).
     */
    const result = await docClient.send(new GetCommand(params));

    /**
     * 3. Existence Check
     * DynamoDB GetItem returns an empty 'Item' property if the key doesn't exist.
     * We map this behavior to a standard HTTP 404 status.
     */
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Item with id ${id} not found`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    /**
     * Global Exception Handling
     * Captures throughput errors, connection issues, or IAM permission failures.
     */
    console.error("Error fetching item:", error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
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
