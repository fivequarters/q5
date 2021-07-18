const { Router } = require('@fusebit-int/pkg-manager');

const router = new Router();

router.get('/api/', async (ctx) => {
  ctx.body = 'Hello World';
});

module.exports = router;