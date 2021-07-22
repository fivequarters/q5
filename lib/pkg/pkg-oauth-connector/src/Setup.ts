import OAuthConnector, { SdkHandler } from './OAuthConnector';
import { IOAuthConfig } from './OAuthEngine';
import { Next, InvokeParameters, Router } from '@fusebit-int/framework';
import router from './OAuthManager';

const Setup = ({ sdkHandler, config }: { sdkHandler?: SdkHandler; config?: Partial<IOAuthConfig> }) => {
  if (sdkHandler) {
    OAuthConnector.authorizeSdkHandler(sdkHandler);
  }
  const prefixRouter = new Router();
  if (config) {
    prefixRouter.on('startup', async (invokeParameters: InvokeParameters, next: Next) => {
      invokeParameters.ctx.event.parameters = { ...invokeParameters, cfg: { ...invokeParameters.cfg, ...config } };
      return next();
    });
  }
  prefixRouter.use(router.routes());
  return { Connector: OAuthConnector, router: prefixRouter };
};
export default Setup;
