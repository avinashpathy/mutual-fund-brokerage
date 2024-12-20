import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import axios from "axios";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const rapidApiClient = axios.create({
  baseURL: "https://latest-mutual-fund-nav.p.rapidapi.com",
  headers: {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY as string,
    "X-RapidAPI-Host": "latest-mutual-fund-nav.p.rapidapi.com",
  },
});

export const handler = async () => {
  try {
    const portfolioFunds = await dynamoDb.send(
      new QueryCommand({
        TableName: process.env.PORTFOLIO_TABLE,
        ProjectionExpression: "fundId",
      })
    );

    const uniqueFunds = [
      ...new Set((portfolioFunds.Items || []).map((item) => item.fundId)),
    ];

    // Update NAV for each fund
    await Promise.all(
      uniqueFunds.map(async (fundId) => {
        try {
          const response = await rapidApiClient.get("/latest", {
            params: { schemeCode: fundId },
          });

          await dynamoDb.send(
            new PutCommand({
              TableName: process.env.FUND_TRACKING_TABLE,
              Item: {
                fundId,
                timestamp: new Date().toISOString(),
                nav: response.data.nav,
                lastUpdated: response.data.lastUpdated,
              },
            })
          );
        } catch (error) {
          console.error(`Error updating NAV for fund ${fundId}:`, error);
        }
      })
    );

    console.log("NAV updates completed successfully");
  } catch (error) {
    console.error("Error in NAV update process:", error);
    throw error;
  }
};
