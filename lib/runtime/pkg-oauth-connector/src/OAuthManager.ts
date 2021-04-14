import FusebitRouter, { FusebitManager, Context, Next, IOnStartup } from '@fusebit-int/pkg-manager';
import { OAuthEngine } from './OAuthEngine';

// Tasks:
//   1. Normalize the configuration element names (remove vendor_oauth)
//   2. Remove the foreign vendor stuff
//   3. Simplify the storage elements or use a passed-in storage subsystem (in-memory for local testing)
//   4. Build out a connector that can make use of the OAuthEngine
//      1. Figure out a unit test narrative
//         1. Call to /callback
//         2. Ask for a token
//            1. Capture the superagent request (mock server?)
//            2. Capture storage (in-memory)
//         3. Validate storage contains expected things.
//      2. Improve conveyance of configuration; bind to router object?
//        1. Does a router object duplicate itself on use, or is it a singleton?
//          - Reset the require cache if multiple of the same object are needed.
// ***  4. Clean up typescript shenanigans.
//   5. Implement also a BasicAuthEngine so it's n>1 within a given connector
//   6. Set up an oauth-connector that steals all of the logic from the app.js and stuff to declare the necessary
//      routes.
//   7. Test against a real OAuth server.
//
// In Parallel:
//   * Implement sessions
//   * Implement component that lives in integration for talking with the connector
//   * Implement element that runs in function-api for instantiating the objects

const router = new FusebitRouter();

let engine: OAuthEngine;
let manager: FusebitManager;

router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg, storage, rtr);
  manager = mgr;
  return next();
});

// Internal Endpoints
router.delete('/', async (ctx: Context, next: Next) => {
  await manager.invoke('uninstall', {});
  return next();
});

router.get('/:lookupKey/health', async (ctx: Context) => {
  ctx.body = 200;
});

router.get('/:lookupKey/token', async (ctx: Context) => {
  ctx.body = await engine.ensureAccessToken(ctx.params.lookupKey);
});

router.delete('/:lookupKey', async (ctx: Context) => {
  ctx.body = await engine.deleteUser(ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/configure', async (ctx: Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.params.state));
});

router.get('/callback', async (ctx: Context) => {
  const state = ctx.params.state;
  const code = ctx.params.code;

  if (!code) {
    ctx.throw(403);
  }
  ctx.body = await engine.convertAccessCodeToToken(state, code);
});

export { router as default };
