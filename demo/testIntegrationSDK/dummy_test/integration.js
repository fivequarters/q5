const { Router, Manager, Form } = require('@fusebit-int/framework');

const router = new Router();

router.get('/api/', async (ctx) => {
  ctx.body = 'Hello World';
});

module.exports = router;