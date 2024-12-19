import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export class SecretManager {
  private client: SecretsManagerClient;

  constructor() {
    // Initialize the Secrets Manager client with the desired region
    this.client = new SecretsManagerClient({ region: "us-east-1" });
  }

  public async getSecret(secretName: string) {
    const command = new GetSecretValueCommand({ SecretId: secretName });

    try {
      const data = await this.client.send(command);

      if (data.SecretString) {
        const secret = JSON.parse(data.SecretString);
        return secret;
      } else if (data.SecretBinary) {
        // Convert Uint8Array to Buffer and then to string
        const decodedBinarySecret = Buffer.from(
          data.SecretBinary as Uint8Array
        ).toString("ascii");
        return decodedBinarySecret;
      }
    } catch (err) {
      console.error("Error retrieving secret:", err);
      throw err; // Rethrow the error for further handling if necessary
    }
  }
}
