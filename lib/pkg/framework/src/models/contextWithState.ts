import { Context } from '@fusebit-int/framework';
import IdentityClient from '../IdentityClient';

export interface ICtxWithState extends Context {
  state: {
    identityClient?: IdentityClient;
  };
}
