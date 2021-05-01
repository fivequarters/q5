import DataSourceMap from '../datasources';
import DataSourceEnum from '../types/DataSourceEnum';
import { DynamoDB } from 'aws-sdk';

abstract class BaseDao {
  protected constructor() {
    this.DynamoDb = DataSourceMap[DataSourceEnum.DynamoDb] as DynamoDB;
  }
  protected readonly DynamoDb: DynamoDB;
}

export default BaseDao;
