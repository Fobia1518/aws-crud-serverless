const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { itemSchema } = require("../utils/schema");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

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

    const expressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    updateKeys.forEach((key) => {
      expressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = validation.data[key];
    });

    expressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
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
