<h3>Mutual Fund Brokerage</h3>

- This is a mutual fund brokerage backend service.
- Tech stack used: AWS (Lambda Fucntions, DynamoDB, IAM, Secrets Manager, API Gateway, CloudFormation), TypeScript, Serverless Framework.
- This repository consists of 5 lambda functions:
  - <b>Register Handler</b>: This handler code registers an user which is triggered by /register POST endpoint.
  - <b>Login Handler</b>: This handler code is used for logging in an user which is triggered by /login POST endpoint.
  - <b>Mutual Fund Handler</b>: This handler code selects a fund family house, fetches open-ended schemes for that family, and it is integrated with the RapidAPI to fetch mutual fund data.
  - <b>Portfolio Handler</b>: This handler code is used to add, view and delete investments of an user.
  - <b>Update NAVS Handler</b>: This handler code is used to track current value of the investments hourly.


<b>Setup and Testing:</b>
- Prerequisites:

  - Install Node.js (18.x or later) and npm (8.x or later) on your machine.
  - Install the Serverless Framework using npm by running npm install -g serverless.
  - Create an AWS account and set up your AWS credentials.
  - Install the AWS CLI and configure it with your AWS credentials.

- Setup

  - Clone the repository.
  - Repository Link: https://github.com/avinashpathy/mutual-fund-brokerage
  - Navigate to the project directory and install the dependencies by running npm install.
  - Run the below AWS CLI command to create your secrets (JWT Secret and RAPID API Key) in AWS Secrets Manager.

    - aws secretsmanager create-secret --name dev/auth/jwt --secret-string '{"JWT_SECRET":"ADD_YOUR_SECRET"}'
    - aws secretsmanager create-secret --name dev/rapidapikey --secret-string '{"RAPIDAPI_KEY":"ADD_YOUR_API_KEY"}'
  - Update the serverless.yml and sls.environments.yml file with your AWS region and other configuration settings as needed. 

- Deployment

  - Run serverless deploy to deploy the application to AWS.
  - The deployment process may take several minutes to complete.
  - Once the deployment is complete, you can verify that the application is running by checking the AWS CloudFormation console.

- Testing

  - API Endpoints

    - The application exposes the following API endpoints:

      - POST /register: creates a new user account.
      - POST /login: logs in an existing user and returns a JSON Web Token.
      - GET /mutual-funds: retrieves a list of open ended mutual fund schemes.
      - GET /portfolio: retrieves a user's portfolio.
      - POST /portfolio: adds a new investment to a user's portfolio.
      - DELETE /portfolio: deletes an investment from a user's portfolio.

  - Use the below postman collection link to test the endpoints.
    - Postman Collection Link: https://www.postman.com/avinashpathy/1bb8d8ed-6d99-42c4-9d67-0abe6041d559/collection/tp8a4r0/mutual-fund-brokerage
    - Replace the request URLs in the above collection with your API url which you can get from API gateway once you have deployed the application to AWS.
    - The request body which you have to pass for each endpoint is provided in the above collection.
    - For /mutual-funds and /portfolio, you have to choose Auth Type as JWT Bearer and give the secret what you have created in AWS Secrets Manager.

