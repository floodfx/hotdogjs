# How to deploy the Lambda project

## THIS DOESN'T WORK YET
Can't seem to get the Websocket / APIGateway configured correctly.  Punting on it for now...

This PoC project uses AWS CDK to define the AWS resources and deploy them to AWS.  If you are not familiar with AWS CDK, please refer to the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html).

Keeping

* First create an AWS account and install the AWS CLI if you haven't already.
* Login to the AWS CLI
  * `aws configure` for non-SSO users
  * `aws sso login [--profile <profile-name>]` for SSO users
* Now you can deploy the project with the following command:
  * `bunx cdk deploy [--profile <profile-name>]`
  * This should deploy the Lambda function and all the necessary resources to AWS and print out the URL of the Lambda function.



