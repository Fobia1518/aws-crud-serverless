const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { id },
      // If the item doesn't exist, DynamoDB will throw a ConditionalCheckFailedException, which can be handled to return a 404 response
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
    // Handle specific case where item does not exist (thanks to ConditionExpression)
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Item not found, nothing to delete" }),
      };
    }

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
