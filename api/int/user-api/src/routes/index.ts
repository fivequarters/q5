import { decodeJwt, verifyJwt } from '@5qtrs/jwt';
import Router from 'koa-router';
import { ApiConfig } from '../ApiConfig';

const subscriptionId = '12345';
const issuers: any = {
  '12345': {
    'accounts.google.com': {
      secret: 'https://www.googleapis.com/oauth2/v1/certs',
    },
    'https://sales-anchor.auth0.com/': {
      secret: 'https://sales-anchor.auth0.com/.well-known/jwks.json',
    },
    'sales-anchor.com': {
      secret: [
        '-----BEGIN PUBLIC KEY-----\n',
        'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAvJC5/bAx8ObAddEhlwT7\n',
        'SM65DA4I4RfvRTfQodTGbGeDeF9KqWpWMjO/n7vV+tVrh2Mna58vpOGCDt1tZK/Y\n',
        'DFMWALIiON+4rwipYI3kK8mKrhnpR0L95u3TUDbXporKUHSVA8R9fCu5kSMwOlTo\n',
        'NyN7IZyWig8aHOBaKWdZkfCyZ7PAmCDHib6E7PoZll9iDU3mFH232ssuVGQtqYI8\n',
        'S79SCnrAanBck4JQU3FGu7NXu8YvUJCD0mM6xMri8lmeqrZT6jkyPCdvJOAiB6Nk\n',
        'e9mwIRm4uf8usgMUXD9ns7VWN4oQsT10EH0dcMGoHb4jiAqDY+Z8EjAeuY7AYYzH\n',
        'x6jUs3UbMMqz8OoVfjGt8OKUMudJSHpeP6/MJZFNhSQnA7UqRQyu++5ScQ/PhnEK\n',
        'X/HGbhm5Y7kYJBl9u+BquKsZ5Vau7bhZ/q+2fGbuP779EESz7vFBs8h8uVN7lnBE\n',
        'U6rtg8rTJm9XLR0Dg49tEXNBTutjC2S7wXpUXuQLxVrvvCj5xX9eEdWDPYHNzfdO\n',
        'DvwuQQ1KiIMbKBIJbRbjukFQMpzBd2XWhoK7wqP3jmmZQvDxFXN4bqh1z3P0fTs+\n',
        'wDPTEh8KnejPl+CVv1eWhSEs4kIjoiWgvGF4rLqucucJkkAjtGGz0P4azWigREM2\n',
        'U50xxbc6Dnowm7AsE6mQneMCAwEAAQ==\n-----END PUBLIC KEY-----\n',
      ].join(''),
    },
  },
};

function authorize(config: ApiConfig) {
  return async (context: any) => {
    const data = context.request.body;
    if (data && data.subscription) {
      if (issuers[data.subscription] && data.token) {
        const subscription = issuers[data.subscription];
        let decoded;

        try {
          decoded = decodeJwt(data.token);
        } catch (error) {
          // do nothing
        }
        if (decoded && decoded.iss) {
          const info = subscription[decoded.iss];
          if (info && info.secret) {
            let verified;
            try {
              verified = await verifyJwt(data.token, info.secret, { audience: config.selfAudience });
            } catch (error) {
              // do nothing
            }

            if (verified) {
              context.body = {
                authorized: true,
                userId: verified.sub,
              };
              return;
            }
          }
        }
      }
    }

    context.status = 403;
  };
}

export function routes(config: ApiConfig) {
  const router = new Router();
  router.post('/authorize', authorize(config));

  return router.routes();
}
