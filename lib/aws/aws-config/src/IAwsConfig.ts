import { AwsCreds } from '@5qtrs/aws-cred';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsConfig {
  creds?: AwsCreds;
  account: string;
  region: string;
  prefix?: string;
}
