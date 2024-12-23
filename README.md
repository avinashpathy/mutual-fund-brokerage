Mutual Fund Brokerage

- This is a mutual fund brokerage backend service.
- Tech stack used: AWS (Lambda Fucntions, DynamoDB, IAM, Secrets Manager, API Gateway, CloudFormation), TypeScript, Serverless Framework.
- This repository consists of 5 lambda functions:
  - <b>Register Handler</b>: This handler code registers an user which is triggered by /register POST endpoint.
  - <b>Login Handler</b>: This handler code is used for logging in an user which is triggered by /login POST endpoint.
  - <b>Mutual Fund Handler</b>: This handler code selects a fund family house, fetches open-ended schemes for that family, and it is integrated with the RapidAPI to fetch mutual fund data.
  - <b>Portfolio Handler</b>: This handler code is used to add, view and delete investments of an user.
  - <b>Update NAVS Handler</b>: This handler code is used to track current value of the investments hourly.

  