import { DynamoDB } from 'aws-sdk';
import Converter from '../../types/Converter';
import Integration from '../../types/Integration';

const IntegrationConverter: Converter<Integration> = {
  fromDynamoBatch: (batchGetItemOutput: DynamoDB.BatchGetItemOutput) => {
    return [];
  },
  fromDynamo: (getItemOutput) => {
    return {};
  },
  fromDynamoQuery: (queryOutput) => {
    return [];
  },
};

export default IntegrationConverter;
