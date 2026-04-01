/**
 * @fileoverview Lambda handler for retrieving inventory items.
 * Supports cursor-based pagination using Base64 tokens and
 * high-performance filtering via Global Secondary Index (GSI).
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Retrieves a list of items from the inventory.
 * * @async
 * @param {Object} event - The AWS API Gateway Lambda Proxy Input.
 * @param {Object} event.queryStringParameters - Optional filters and pagination.
 * @param {string} [event.queryStringParameters.limit=10] - Number of items to retrieve.
 * @param {string} [event.queryStringParameters.nextKey] - Base64 encoded LastEvaluatedKey for pagination.
 * @param {string} [event.queryStringParameters.category] - Filter items by category using GSI.
 * @returns {Promise<Object>} API Gateway Proxy Result with 200 (Success) and pagination metadata.
 * * @description
 * 1. Pagination: Uses 'ExclusiveStartKey' to resume results from a previous request.
 * 2. Optimization: If a category is provided, it performs a 'Query' on 'CategoryIndex' (faster/cheaper).
 * 3. Fallback: If no category is provided, it performs a 'Scan' on the base table.
 */
module.exports.handler = async (event) => {
  try {
    // Extract and sanitize query parameters
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 10;
    const nextKeyEncoded = event.queryStringParameters?.nextKey;
    const category = event.queryStringParameters?.category; // Filter optional

    let result;
    const params = {
      TableName: process.env.ITEMS_TABLE,
      Limit: limit,
    };

    /**
     * 1. Handle Pagination Token
     * We decode the Base64 string back into a JSON object that DynamoDB
     * understands as 'ExclusiveStartKey'. This hides DB internals from the client.
     */
    if (nextKeyEncoded) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextKeyEncoded, "base64").toString(),
      );
    }

    /**
     * 2. Search Strategy: Filter by category or show all inventory
     */
    if (category) {
      /**
       * Use Global Secondary Index (GSI) for maximum speed.
       * A 'Query' operation is O(log n) compared to 'Scan' which is O(n).
       */
      params.IndexName = "CategoryIndex";
      params.KeyConditionExpression = "category = :cat";
      params.ExpressionAttributeValues = { ":cat": category };
      result = await docClient.send(new QueryCommand(params));
    } else {
      /**
       * Full table scan with limit.
       * Necessary when no specific Partition Key (category) is targeted.
       */
      result = await docClient.send(new ScanCommand(params));
    }

    /**
     * 3. Generate the Token for the next page
     * If 'LastEvaluatedKey' exists, it means there are more items to fetch.
     * We encode it in Base64 to provide an opaque 'nextKey' to the API consumer.
     */
    let nextToken = null;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
        "base64",
      );
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: result.Items,
        pagination: {
          nextKey: nextToken,
          count: result.Count,
          hasMore: !!nextToken,
        },
      }),
    };
  } catch (error) {
    /**
     * Error Handling
     * Logs the full error for CloudWatch and returns a sanitized message to the client.
     */
    console.error("Error fetching inventory:", error);
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
