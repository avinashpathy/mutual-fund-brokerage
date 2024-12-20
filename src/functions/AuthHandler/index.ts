import * as jwt from "jsonwebtoken";
import { Config } from "../../../utils/config";
import { SecretManager } from "../../managers/secret-manager";

const config = new Config();
const { JWT_SECRET } = config;

interface AuthResponse {
  principalId: string;
  policyDocument?: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: string;
      Resource: string;
    }>;
  };
  context?: {
    [key: string]: string | number | boolean;
  };
}

const generatePolicy = (
  principalId: string,
  effect: string,
  resource: string,
  context?: { [key: string]: string | number | boolean }
): AuthResponse => {
  const authResponse: AuthResponse = {
    principalId,
    context, // Add the context to the response
  };

  if (effect && resource) {
    authResponse.policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    };
  }

  return authResponse;
};

export const handler = async (event: {
  authorizationToken: string;
  methodArn: string;
}): Promise<AuthResponse> => {
  try {
    const authorizationHeader = event.authorizationToken;
    if (!authorizationHeader) {
      throw new Error("No authorization header");
    }

    const tokenParts = authorizationHeader.split(" ");
    const tokenValue = tokenParts[1];

    if (!(tokenParts[0].toLowerCase() === "bearer" && tokenValue)) {
      throw new Error("Invalid authorization header");
    }

    const secretManager = new SecretManager();
    const jwtSecret = await secretManager.getSecret(JWT_SECRET);

    let decoded: any;

    try {
      decoded = jwt.verify(tokenValue, jwtSecret.JWT_SECRET as jwt.Secret);
      console.log("tokenValue:", tokenValue);
      console.log("jwtSecret:", jwtSecret.JWT_SECRET);
      console.log("decoded:", decoded);
    } catch (error) {
      console.error("Error verifying token:", error);
    }

    // Pass the email in the context
    return generatePolicy(decoded.email, "Allow", event.methodArn, {
      email: decoded.email,
    });
  } catch (error) {
    console.error("Authorization error:", error);
    throw new Error("Unauthorized");
  }
};
