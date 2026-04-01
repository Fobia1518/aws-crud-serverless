/**
 * @fileoverview Lambda handler for partial updates (PATCH-style) of inventory items.
 * Uses dynamic expression building to update only provided fields and implements
 * conditional checks to prevent creating new items during an update operation.
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { itemSchema } = require("../utils/schema");

// Initialize DynamoDB Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Updates an existing item in the database.
 * * @async
 * @param {Object} event - The AWS API Gateway Lambda Proxy Input.
 * @param {string} event.pathParameters.id - The unique ID of the item to update.
 * @param {string} event.body - JSON string with the fields to be updated.
 * @returns {Promise<Object>} 200 OK with the updated item, 400 on validation error, or 404 if item missing.
 */
module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    /**
     * 1. Schema Validation (Partial)
     * We use .partial() so Zod doesn't require all fields, allowing true PATCH behavior.
     */
    const validation = itemSchema.partial().safeParse(body);

    if (!validation.success) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Validation Error",
          errors: validation.error.format(),
        }),
      };
    }

    const updateKeys = Object.keys(validation.data);
    if (updateKeys.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields provided to update" }),
      };
    }

    /**
     * 2. Dynamic Update Expression Building
     * Instead of hardcoding SET name = :n, we programmatically build:
     * - UpdateExpression
     * - ExpressionAttributeNames (to handle reserved words)
     * - ExpressionAttributeValues
     */
    const expressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    updateKeys.forEach((key) => {
      expressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = validation.data[key];
    });

    // Automatically append an updatedAt timestamp
    expressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    // Map ID for the ConditionExpression to ensure we don't accidentally create a new item if the ID doesn't exist
    expressionAttributeNames["#id"] = "id";

    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
      /**
       * 3. Atomicity & Integrity Check
       * 'attribute_exists(#id)' ensures we only update existing records.
       * Without this, DynamoDB would perform an 'upsert' (create a new item).
       */
      ConditionExpression: "attribute_exists(#id)",
    };

    const result = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Item updated successfully",
        item: result.Attributes,
      }),
    };
  } catch (error) {
    /**
     * 4. Specialized Error Handling
     * If ConditionExpression fails, it means the ID does not exist in the table.
     */
    if (error.name === "ConditionalCheckFailedException") {
      console.error(
        "Error updating item ConditionalCheckFailedException:",
        error,
      );
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message,
          message: `Item with id ${event.pathParameters.id} does not exist. Update failed.`,
        }),
      };
    }

    console.error("Error updating item:", error);

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
