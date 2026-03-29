const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: process.env.ITEMS_TABLE,
    }));

    return {
      statusCode: 200,
      body: result.Items,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { message: "Error fetching items", error: error.message },
    };
  }
};