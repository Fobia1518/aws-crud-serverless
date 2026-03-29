const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
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

    // 1. Handle Pagination Token
    if (nextKeyEncoded) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextKeyEncoded, "base64").toString(),
      );
    }

    // 2. Filter by category or show all inventory
    if (category) {
      // Use index for maximum speed if there is a category
      params.IndexName = "CategoryIndex";
      params.KeyConditionExpression = "category = :cat";
      params.ExpressionAttributeValues = { ":cat": category };
      result = await docClient.send(new QueryCommand(params));
    } else {
      // To see all inventory, use Scan with Limit
      result = await docClient.send(new ScanCommand(params));
    }

    // 3. Generate the Token for the next page
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
    console.error("Error fetching inventory:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Error", error: error.message }),
    };
  }
};
