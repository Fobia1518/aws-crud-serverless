# 🚀 AWS Inventory Serverless API - Code Challenge 5

A production-ready RESTful Inventory API built with **Serverless Framework**, designed for high scalability and security using AWS native services.

[![Serverless](https://img.shields.io/badge/serverless-v4.0+-ff5242?logo=serverless)](https://www.serverless.com/)
[![Node.js](https://img.shields.io/badge/node-v20.x+-339933?logo=node.js)](https://nodejs.org/)
[![DynamoDB](https://img.shields.io/badge/database-DynamoDB-4053D6?logo=amazondynamodb)](https://aws.amazon.com/dynamodb/)

## 📝 Project Overview

This system manages a product inventory with advanced features such as category filtering, cursor-based pagination, and endpoint protection via **Amazon Cognito**. The architecture follows the principle of least privilege for IAM roles and implements strict data validation.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 20.x
- **Framework:** Serverless Framework
- **Database:** Amazon DynamoDB (NoSQL)
- **Validation:** [Zod](https://zod.dev/) (Strict type safety)
- **Security:** IAM Roles & Cognito Authorizer
- **Observability:** AWS CloudWatch Logs

---

## 🛣️ API Endpoints

### 📦 Inventory Management

| Method   | Endpoint      | Description                                                  | Auth Required     |
| :------- | :------------ | :----------------------------------------------------------- | :---------------- |
| `POST`   | `/items`      | Create a new product.                                        | **Yes (Cognito)** |
| `GET`    | `/items`      | List products (supports `limit`, `nextKey`, and `category`). | **Yes (Cognito)** |
| `GET`    | `/items/{id}` | Retrieve detailed information for a specific item.           | **Yes (Cognito)** |
| `PUT`    | `/items/{id}` | Update specific fields of an existing item.                  | **Yes (Cognito)** |
| `DELETE` | `/items/{id}` | Permanently remove an item from the inventory.               | **Yes (Cognito)** |

---

## ⚙️ Advanced Features & Implementation

### 1. Efficient Pagination & Filtering

The `GET /items` endpoint implements **Cursor-based Pagination** using `LastEvaluatedKey` encoded in `Base64`. This prevents "Full Table Scans" and ensures consistent performance as the database grows. Filtering by category is optimized using a **Global Secondary Index (GSI)**.

### 2. Atomic Updates & Upsert Protection

To prevent accidental record creation during updates, the `updateItem` handler uses a **DynamoDB ConditionExpression** (`attribute_exists(#id)`). If the ID does not exist, the API returns a proper `404 Not Found` instead of creating a malformed entry.

### 3. Dynamic Update Expressions

The update logic is fully dynamic. It maps the request body keys to `ExpressionAttributeNames` and `ExpressionAttributeValues` automatically, allowing partial updates (PATCH-style) without hardcoding every field.

### 4. Schema Validation

Leveraging **Zod**, the API enforces strict data schemas. It ensures that `price` is a positive number and `category` belongs to an allowed enumeration before any database interaction occurs.

---

## 🔐 Environment Variables

The following variables are required for deployment and local testing:

- `COGNITO_USER_POOL_ID`: The ID of your Amazon Cognito User Pool.
- `COGNITO_CLIENT_ID`: The App Client ID for the User Pool.
- `ITEMS_TABLE`: (Optional) Custom name for the DynamoDB table.

---

### Create Item Example

**POST** `/items`
**Body:**

```json
{
  "name": "Mechanical Keyboard",
  "price": 89.99,
  "category": "electronics",
  "description": "RGB Backlit"
}
```

### Response (201):

```json
{
  "message": "Item created successfully",
  "item": { "id": "uuid-v4", ... }
}
```

---

### Error Handling

| Status Code | Description    | Reason                                          |
| :---------- | :------------- | :---------------------------------------------- |
| 400         | Bad Request    | Validation error (Zod) or empty body.           |
| 401         | Unauthorized   | Missing or expired Cognito JWT token.           |
| 404         | Not Found      | The provided ID does not exist in the database. |
| 500         | Internal Error | Unexpected server or AWS service error.         |
