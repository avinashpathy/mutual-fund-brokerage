import { APIGatewayProxyHandler } from "aws-lambda";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse } from "../../../utils/helpers";
import { SecretManager } from "../../managers/secret-manager";
import { Config } from "../../../utils/config";

const config = new Config();
const { JWT_SECRET } = config;

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface LoginRequest {
  email: string;
  password: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, { message: "Missing request body" });
    }

    const { email, password }: LoginRequest = JSON.parse(event.body);

    // Validate inputs
    if (!email || !password) {
      return createResponse(400, {
        message: "Email and password are required",
      });
    }

    // Get user from DynamoDB
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { email },
      })
    );

    const user = result.Item;

    if (!user) {
      return createResponse(401, { message: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return createResponse(401, { message: "Invalid credentials" });
    }

    const secretManager = new SecretManager();
    const jwtSecret = await secretManager.getSecret(JWT_SECRET);

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email },
      jwtSecret.JWT_SECRET as jwt.Secret,
      {
        expiresIn: "24h",
      }
    );

    return createResponse(200, {
      message: "Login successful",
      token,
      user: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return createResponse(500, { message: "Internal server error" });
  }
};
