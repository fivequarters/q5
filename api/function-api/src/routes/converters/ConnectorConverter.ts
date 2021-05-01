import { DynamoDB } from 'aws-sdk';
import Connector from '../../types/Connector';
import Converter from '../../types/Converter';

const ConnectorConverter: Converter<Connector> = {
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

export default ConnectorConverter;
