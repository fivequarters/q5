import FusebitRouter, { FusebitManager, Context, Next, IStorage } from '@fusebit-int/pkg-manager';
import { OAuthEngine } from './OAuthEngine';
import { IOAuthConfig } from './Common';

// Tasks:
//   1. Normalize the configuration element names (remove vendor_oauth)
//   2. Remove the foreign vendor stuff
//   3. Simplify the storage elements or use a passed-in storage subsystem (in-memory for local testing)
// **4. Build out a connector that can make use of the OAuthEngine
//      1. Figure out a unit test narrative
//         1. Call to /callback
//         2. Ask for a token
//            1. Capture the superagent request (mock server?)
//            2. Capture storage (in-memory)
//         3. Validate storage contains expected things.
//      2. Improve conveyance of configuration; bind to router object?
//      3. Bring tests from oauth-connector over.
//      4. Clean up typescript shenanigans.
//   5. Implement also a BasicAuthEngine so it's n>1
//   6. Set up an oauth-connector that steals all of the logic from the app.js and stuff to declare the necessary
//      routes.
//   7. Set up a testing scheme with ngrok involved against a test OAuth server, maybe locally so that it can
//      be automated.

const router = new FusebitRouter();

let engine: OAuthEngine;
let manager: FusebitManager;

router.on(
  'startup',
  async ({ mgr, cfg, storage }: { mgr: FusebitManager; cfg: IOAuthConfig; storage: IStorage }, next: Next) => {
    engine = new OAuthEngine(cfg, storage, router);
    manager = mgr;
    return next();
  }
);

// Internal Endpoints
router.delete('/', async (ctx: Context, next: Next) => {
  return manager.invoke('uninstall', {});
});

router.get('/:userId/health', async (ctx: Context, next: Next) => {
  ctx.body = 200;
});

router.get('/:userId/token', async (ctx: Context) => {
  ctx.body = await engine.ensureAccessToken(ctx.params.userId);
});

router.delete('/:userId', async (ctx: Context, next: Next) => {
  ctx.body = await engine.deleteUser(ctx.params.userId);
});

// OAuth Flow Endpoints
router.get('/configure', async (ctx: Context, next: Next) => {
  ctx.redirect(await engine.getAuthorizationUrl((ctx.req as any).params.state));
});

router.get('/callback', async (ctx: Context, next: Next) => {
  // Do we return the code here, or do we just return success?
  if ((ctx.req as any).params.code) {
    ctx.body = await engine.convertAccessCodeToToken((ctx.req as any).params.state, (ctx.req as any).params.code);
  }
  ctx.throw(403);
});

// Test Endpoints
router.get('/test', async (ctx: Context, next: Next) => {
  // Return the self-/configure url to test things.
});

router.get('/test-callback', async (ctx: Context, next: Next) => {
  // Return the self-/configure url to test things.
});

export { router as default };
