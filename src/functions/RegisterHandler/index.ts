import { APIGatewayProxyHandler } from "aws-lambda";
import * as bcrypt from "bcryptjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { validateEmail, createResponse } from "../../../utils/helpers";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface RegisterRequest {
  email: string;
  password: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, { message: "Missing request body" });
    }

    const { email, password }: RegisterRequest = JSON.parse(event.body);

    // Validate inputs
    if (!email || !password) {
      return createResponse(400, {
        message: "Email and password are required",
      });
    }

    if (!validateEmail(email)) {
      return createResponse(400, { message: "Invalid email format" });
    }

    if (password.length < 8) {
      return createResponse(400, {
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await dynamoDb.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { email },
      })
    );

    if (existingUser.Item) {
      return createResponse(409, { message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to DynamoDB
    const timestamp = new Date().toISOString();
    const user = {
      email,
      password: hashedPassword,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName: process.env.USERS_TABLE,
        Item: user,
      })
    );

    return createResponse(201, {
      message: "User registered successfully",
      user: {
        email,
        createdAt: timestamp,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return createResponse(500, { message: "Internal server error" });
  }
};
