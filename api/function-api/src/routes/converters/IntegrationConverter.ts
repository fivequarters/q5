import { DynamoDB } from 'aws-sdk';
import Converter from '../types/Converter';
import Integration from '../types/Integration';

// Converters define the mapping of a database output to a recognizable object.
// Utility for re-use, and for better typescripting
const IntegrationConverter: Converter<Integration> = {
  fromDynamoBatch: (batchGetItemOutput: DynamoDB.BatchGetItemOutput) => {
    return [];
  },
  fromDynamo: (getItemOutput) => {
    return { name: 'stubbed' };
  },
  fromDynamoQuery: (queryOutput) => {
    return [];
  },
};

export default IntegrationConverter;
