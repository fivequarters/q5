import SdkBaseClass, { NamespaceArguments, SdkClass } from './SdkBase';
import { Context } from '../Router';

const constructorArguments: NamespaceArguments = {
  middleware: {
    loadConnector: undefined,
  },
  service: {
    //TODO allow connector to access it's own sdk with an identity id
    getSdk: async (ctx: Context, identityId: string) => undefined,
    getSdks: (ctx: Context, identityIds: string[]) => undefined,
  },
  storage: {},
  response: {
    createJsonForm: undefined, //TODO
    createError: undefined, //TODO
  },
};

export default class Connector extends SdkBaseClass implements SdkClass {
  constructor() {
    super(constructorArguments);
  }
}
