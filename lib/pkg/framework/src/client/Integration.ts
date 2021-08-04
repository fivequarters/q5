import SdkBaseClass, { NamespaceArguments, SdkClass } from './SdkBase';
import { Context } from '../Router';

const constructorArguments: NamespaceArguments = {
  middleware: {
    loadConnector: undefined,
  },
  service: {
    getSdk: async (ctx: Context, connectorName: string) =>
      ctx.state.manager.connectors.getByName(connectorName, (ctx: Context) => ctx.params.tenantId)(ctx),
    getSdks: (ctx: Context, connectorNames: string[]) =>
      ctx.state.manager.connectors.getByNames(connectorNames, (ctx: Context) => ctx.params.tenantIc)(ctx),
  },
  storage: {},
  response: {
    createJsonForm: undefined, //TODO
    createError: undefined, //TODO
  },
};

class Integration extends SdkBaseClass implements SdkClass {
  constructor() {
    super(constructorArguments);
  }
}

export default Integration;
