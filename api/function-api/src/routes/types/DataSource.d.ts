import { DynamoDB } from 'aws-sdk';

// Use a union here to implement additional data sources
type DataSource = DynamoDB;
export default DataSource;
