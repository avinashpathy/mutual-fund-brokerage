import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { createResponse } from "../../../utils/helpers";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  const operation = event.queryStringParameters?.operation;

  try {
    switch (operation) {
      case "add": {
        if (!event.body) {
          return createResponse(400, { message: "Request body is required" });
        }

        const { schemeCode, units, purchasePrice, purchaseDate, userEmail } =
          JSON.parse(event.body);

        // Validate input
        if (!schemeCode || !units || !purchasePrice || !purchaseDate) {
          return createResponse(400, { message: "Missing required fields" });
        }

        // Add investment to portfolio
        await dynamoDb.send(
          new PutCommand({
            TableName: process.env.PORTFOLIO_TABLE,
            Item: {
              userId: userEmail,
              fundId: schemeCode,
              units: Number(units),
              purchasePrice: Number(purchasePrice),
              purchaseDate,
              createdAt: new Date().toISOString(),
            },
          })
        );

        return createResponse(201, {
          message: "Investment added to portfolio",
        });
      }

      case "view": {
        // Get user's portfolio
        const userEmail = event.queryStringParameters?.userEmail;
        const portfolioResult = await dynamoDb.send(
          new QueryCommand({
            TableName: process.env.PORTFOLIO_TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
              ":userId": userEmail,
            },
          })
        );

        if (portfolioResult.Items?.length === 0) {
          return createResponse(404, {
            message: "No records found for user email",
          });
        }
        // Get current NAV for all funds in portfolio
        const investments = await Promise.all(
          (portfolioResult.Items || []).map(async (item) => {
            const navResult = await dynamoDb.send(
              new QueryCommand({
                TableName: process.env.FUND_TRACKING_TABLE,
                KeyConditionExpression: "fundId = :fundId",
                ExpressionAttributeValues: {
                  ":fundId": item.fundId,
                },
                Limit: 1,
                ScanIndexForward: false, // Get most recent first
              })
            );

            const currentNav = navResult.Items?.[0]?.nav || item.purchasePrice;
            const currentValue = item.units * currentNav;
            const investmentValue = item.units * item.purchasePrice;
            const returns =
              ((currentValue - investmentValue) / investmentValue) * 100;

            return {
              ...item,
              currentNav,
              currentValue,
              returns: returns.toFixed(2),
            };
          })
        );

        return createResponse(200, { investments });
      }

      case "delete": {
        if (!event.body) {
          return createResponse(400, { message: "Request body is required" });
        }

        const { fundId, userEmail } = JSON.parse(event.body);

        await dynamoDb.send(
          new DeleteCommand({
            TableName: process.env.PORTFOLIO_TABLE,
            Key: {
              userId: userEmail,
              fundId,
            },
          })
        );

        return createResponse(200, {
          message: "Investment removed from portfolio",
        });
      }

      default:
        return createResponse(400, { message: "Invalid operation" });
    }
  } catch (error) {
    console.error("Portfolio operation error:", error);
    return createResponse(500, {
      message: "Failed to process portfolio request",
    });
  }
};
