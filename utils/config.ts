export class Config {
  public JWT_SECRET: string;

  constructor() {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
      throw new Error("Missing required environment variables");
    }

    this.JWT_SECRET = JWT_SECRET;
  }
}
