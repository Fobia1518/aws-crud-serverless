/**
 * @fileoverview Lambda handler for deleting an inventory item.
 * Implements an existence check via ConditionExpression to distinguish
 * between successful deletions and non-existent records.
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Deletes a specific item from the DynamoDB table.
 * * @async
 * @param {Object} event - The AWS API Gateway Lambda Proxy Input.
 * @param {Object} event.pathParameters - Contains the route parameters.
 * @param {string} event.pathParameters.id - The unique identifier of the item to delete.
 * @returns {Promise<Object>} 200 OK if deleted, or 404 if the item didn't exist.
 * * @example
 * Path: /items/550e8400-e29b-41d4-a716-446655440000
 * Success: 200 { "message": "Item with id ... deleted successfully" }
 * Error: 404 { "message": "Item not found, nothing to delete" }
 */
module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { id },
      /**
       * Integrity Check:
       * By default, DynamoDB DeleteItem is idempotent (it returns 200 even if the key is missing).
       * We use 'attribute_exists(id)' to force an error if the item is not found,
       * allowing us to provide more accurate API feedback (404 vs 200).
       */
      ConditionExpression: "attribute_exists(id)",
    };

    await docClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Item with id ${id} deleted successfully`,
      }),
    };
  } catch (error) {
    /**
     * 404 Handling:
     * Catch the specialized AWS exception triggered by the ConditionExpression.
     */
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Item not found, nothing to delete" }),
      };
    }

    // Logging generic service or permission errors
    console.error("Error deleting item:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Error deleting item",
        error: error.message,
      }),
    };
  }
};
