import SdkBaseClass, { NamespaceArguments, SdkClass } from './SdkBase';

const constructorArguments: NamespaceArguments = {
  middleware: {
    loadConnector: undefined,
  },
  service: {
    getSdk: () => {},
    getSdks: () => {},
  },
  storage: {},
  response: {
    createJsonForm: undefined, //TODO
    createError: undefined, //TODO
  },
};

export default class Integration extends SdkBaseClass implements SdkClass {
  protected constructor() {
    super(constructorArguments);
  }
}
