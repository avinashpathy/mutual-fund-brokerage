// portfolioValueUpdater.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async () => {
  try {
    // Get all unique users with investments
    const usersResult = await dynamoDb.send(
      new ScanCommand({
        TableName: process.env.PORTFOLIO_TABLE,
        ProjectionExpression: "userId",
      })
    );

    // Get unique user IDs
    const userIds = [
      ...new Set((usersResult.Items || []).map((item) => item.userId)),
    ];

    // Process each user's portfolio
    await Promise.all(
      userIds.map(async (userId) => {
        // Get user's portfolio
        const portfolioResult = await dynamoDb.send(
          new QueryCommand({
            TableName: process.env.PORTFOLIO_TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
              ":userId": userId,
            },
          })
        );

        if (!portfolioResult.Items?.length) {
          return;
        }

        // Calculate total value
        let totalValue = 0;
        await Promise.all(
          portfolioResult.Items.map(async (item) => {
            const navResult = await dynamoDb.send(
              new QueryCommand({
                TableName: process.env.FUND_TRACKING_TABLE,
                KeyConditionExpression: "fundId = :fundId",
                ExpressionAttributeValues: {
                  ":fundId": item.fundId,
                },
                Limit: 1,
                ScanIndexForward: false,
              })
            );

            const currentNav = navResult.Items?.[0]?.nav || item.purchasePrice;
            totalValue += item.units * currentNav;
          })
        );

        // Store the calculated value
        await dynamoDb.send(
          new PutCommand({
            TableName: process.env.PORTFOLIO_VALUE_TABLE,
            Item: {
              userId,
              totalValue,
              timestamp: new Date().toISOString(),
            },
          })
        );
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Portfolio values updated successfully",
        usersProcessed: userIds.length,
      }),
    };
  } catch (error) {
    console.error("Error updating portfolio values:", error);
    throw error;
  }
};
