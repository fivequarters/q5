import { Context, Next, Router } from '@fusebit-int/framework';

const router = new Router();

router.get('/api', (ctx: Context) => {
  ctx.body = 'hello world';
});