import { DynamoDB } from 'aws-sdk';
import Connector from '../types/Connector';
import Converter from '../types/Converter';

// Converters define the mapping of a database output to a recognizable object.
// Utility for re-use, and for better typescripting
const ConnectorConverter: Converter<Connector> = {
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

export default ConnectorConverter;
