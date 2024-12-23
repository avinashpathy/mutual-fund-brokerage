import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import axios from "axios";
import { createResponse } from "../../../utils/helpers";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const rapidApiClient = axios.create({
  baseURL: "https://latest-mutual-fund-nav.p.rapidapi.com",
  headers: {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY as string,
    "X-RapidAPI-Host": "latest-mutual-fund-nav.p.rapidapi.com",
  },
});

interface MutualFundScheme {
  Scheme_Code: number;
  ISIN_Div_Payout_ISIN_Growth: string;
  ISIN_Div_Reinvestment: string;
  Scheme_Name: string;
  Net_Asset_Value: number;
  Date: string;
  Scheme_Type: string;
  Scheme_Category: string;
  Mutual_Fund_Family: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const operation = event.queryStringParameters?.operation;

    if (!operation) {
      return createResponse(400, {
        message: "Operation parameter is required (families or schemes)",
      });
    }

    switch (operation) {
      case "families": {
        try {
          const response = await rapidApiClient.get("/latest", {
            params: {
              Scheme_Type: "Open",
            },
          });

          if (!Array.isArray(response.data)) {
            console.error("Unexpected API response format:", response.data);
            return createResponse(500, {
              message: "Unexpected API response format",
              error: "Data is not an array",
            });
          }

          const families = [
            ...new Set(
              response.data
                .map((fund: MutualFundScheme) => fund.Mutual_Fund_Family)
                .filter(Boolean)
            ),
          ].sort();

          console.log(`Found ${families.length} unique fund families`);

          const familiesWithDetails = families.map((familyName) => {
            const familySchemes = response.data.filter(
              (scheme: MutualFundScheme) =>
                scheme.Mutual_Fund_Family === familyName
            );

            return {
              name: familyName,
              schemeCount: familySchemes.length,
              categories: [
                ...new Set(
                  familySchemes.map((scheme: any) => scheme.scheme_category)
                ),
              ].sort(),
            };
          });

          return createResponse(200, {
            totalFamilies: families.length,
            families: familiesWithDetails,
          });
        } catch (apiError: any) {
          console.error("RapidAPI Error:", {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message,
          });
          return createResponse(500, {
            message: "Failed to fetch fund families",
            error: apiError.response?.data || apiError.message,
          });
        }
      }

      case "schemes": {
        const familyName = event.queryStringParameters?.familyName;

        if (!familyName) {
          return createResponse(400, {
            message: "Fund family name is required for schemes operation",
          });
        }

        try {
          const response = await rapidApiClient.get("/latest", {
            params: {
              Scheme_Type: "Open",
            },
          });

          if (!Array.isArray(response.data)) {
            return createResponse(500, {
              message: "Unexpected API response format",
              error: "Data is not an array",
            });
          }

          // Filter schemes for the specific family
          const schemes = response.data.filter(
            (scheme: MutualFundScheme) =>
              scheme.Mutual_Fund_Family.toLowerCase() ===
              familyName.toLowerCase()
          );

          if (schemes.length === 0) {
            return createResponse(404, {
              message: `No schemes found for fund family: ${familyName}`,
              availableFamilies: [
                ...new Set(
                  response.data.map((scheme) => scheme.Mutual_Fund_Family)
                ),
              ].sort(),
            });
          }

          // Store schemes in DynamoDB
          const timestamp = new Date().toISOString();
          const promises = schemes.map((scheme: MutualFundScheme) => {
            return dynamoDb.send(
              new PutCommand({
                TableName: process.env.FUND_TRACKING_TABLE,
                Item: {
                  fundId: scheme.Scheme_Code,
                  timestamp,
                  familyName: scheme.Mutual_Fund_Family,
                  schemeName: scheme.Scheme_Name,
                  nav: scheme.Net_Asset_Value,
                  lastUpdated: scheme.Date,
                  schemeCategory: scheme.Scheme_Category,
                  schemeType: scheme.Scheme_Type,
                },
              })
            );
          });

          await Promise.all(promises);

          // Group schemes by category for better organization
          const schemesByCategory = schemes.reduce(
            (acc: any, scheme: MutualFundScheme) => {
              const category = scheme.Scheme_Category || "Uncategorized";
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(scheme);
              return acc;
            },
            {}
          );

          return createResponse(200, {
            familyName,
            totalSchemes: schemes.length,
            schemesByCategory,
          });
        } catch (apiError: any) {
          console.error("RapidAPI Error for schemes:", {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message,
          });
          return createResponse(500, {
            message: "Failed to fetch schemes",
            error: apiError.response?.data || apiError.message,
          });
        }
      }

      default:
        return createResponse(400, {
          message: 'Invalid operation. Use "families" or "schemes"',
        });
    }
  } catch (error) {
    console.error("Error in mutual fund handler:", error);
    return createResponse(500, {
      message: "Failed to process mutual fund request",
      error: "Internal server error",
    });
  }
};
