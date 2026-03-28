const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    // 1. Parser data objects
    const body = JSON.parse(event.body);
    
    // 2. Created object to save
    const newItem = {
      id: crypto.randomUUID(),
      name: body.name,
      price: body.price,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: process.env.ITEMS_TABLE,
      Item: newItem,
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Item created successfully",
        item: newItem,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating item", error: error.message }),
    };
  }
};