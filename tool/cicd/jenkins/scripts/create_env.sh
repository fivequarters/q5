#!/bin/bash

# Set the environment needed to bootstrap fusebit api
DOTENV=api/function-api/.env
echo DEPLOYMENT_KEY=jenkins > ${DOTENV}.template
echo AWS_REGION=us-east-2 >> ${DOTENV}.template
echo > ${DOTENV}.bootstrap
echo AWS_S3_BUCKET=jenkins.us-east-2.dev.fusebit.io >> ${DOTENV}.template
echo API_SERVER=https://jenkins.us-east-2.dev.fusebit.io >> ${DOTENV}.template
echo SERVICE_ROLE=arn:aws:iam::749775346857:role/fusebit-EC2-instance >> ${DOTENV}.template
echo LAMBDA_BUILDER_ROLE=arn:aws:iam::749775346857:role/fusebit-builder >> ${DOTENV}.template
echo LAMBDA_MODULE_BUILDER_ROLE=arn:aws:iam::749775346857:role/fusebit-builder >> ${DOTENV}.template
echo LAMBDA_USER_FUNCTION_ROLE=arn:aws:iam::749775346857:role/fusebit-function >> ${DOTENV}.template
echo LAMBDA_VPC_SUBNETS=subnet-00961f73033bc3ed4,subnet-0003c7bfe2a2cc399 >> ${DOTENV}.template
echo LAMBDA_VPC_SECURITY_GROUPS=sg-0c21e2876905b7097 >> ${DOTENV}.template
echo CRON_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/749775346857/jenkins-cron >> ${DOTENV}.template
echo LAMBDA_USER_FUNCTION_PERMISSIONLESS_ROLE=arn:aws:iam::749775346857:role/fusebit-function-permissionless >> ${DOTENV}.template
