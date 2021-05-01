import DataSourceEnum from '../types/DataSourceEnum';
import DataSource from '../types/DataSource';
import { DynamoDB } from 'aws-sdk';

const DataSourceMap: Record<DataSourceEnum, DataSource> = {
  [DataSourceEnum.DynamoDb]: new DynamoDB(),
};

export default DataSourceMap;
