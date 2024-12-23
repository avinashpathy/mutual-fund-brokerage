export class Config {
  public JWT_SECRET: string;
  public RAPIDAPI_KEY: string;
  constructor() {
    const { JWT_SECRET, RAPIDAPI_KEY } = process.env;
    if (!JWT_SECRET || !RAPIDAPI_KEY) {
      throw new Error("Missing required environment variables");
    }

    this.JWT_SECRET = JWT_SECRET;
    this.RAPIDAPI_KEY = RAPIDAPI_KEY;
  }
}
