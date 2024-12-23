import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export class SecretManager {
  private client: SecretsManagerClient;

  constructor() {
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
        const decodedBinarySecret = Buffer.from(
          data.SecretBinary as Uint8Array
        ).toString("ascii");
        return decodedBinarySecret;
      }
    } catch (err) {
      console.error("Error retrieving secret:", err);
      throw err;
    }
  }
}
