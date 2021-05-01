import { DynamoDB } from 'aws-sdk';
import DataType from './DataType';

type Converter<T extends DataType> = {
  fromDynamo: (getItemOutput: DynamoDB.GetItemOutput) => T;
  fromDynamoBatch: (batchGetItemOutput: DynamoDB.BatchGetItemOutput) => T[];
  fromDynamoQuery: (queryOutput: DynamoDB.QueryOutput) => T[];
};

export default Converter;
