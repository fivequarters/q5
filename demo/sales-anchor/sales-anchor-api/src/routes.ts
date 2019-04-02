import { signJwt } from '@5qtrs/jwt';
import { request } from '@5qtrs/request';
import Router from 'koa-router';
import { ApiConfig } from './ApiConfig';
import { AuthAuth0 } from './AuthAuth0';
import { AuthGoogle } from './AuthGoogle';
import { getAdmin, getNextInquiry, inquiries, salesAgents } from './data';

// ------------------
// Internal Functions
// ------------------

function login(config: ApiConfig, authGoogle: AuthGoogle) {
  return async (context: any) => {
    const accessToken = await authGoogle.createAccessToken(context.request.body.idToken);
    context.body = { accessToken };
  };
}

function getAgents(config: ApiConfig) {
  return async (context: any) => {
    context.body = salesAgents;
  };
}

function generateInquiry(config: ApiConfig) {
  return async (context: any) => {
    const decodedAccessToken = context.deocodedAccessToken;
    const userId = decodedAccessToken.sub;
    const admin = getAdmin(userId);
    const functionsUrl = `${config.functionsBaseUrl}/v1/run/${admin.company}/${admin.company}/${config.functionName}`;

    let inquiry = getNextInquiry();
    try {
      const response = await request({
        method: 'POST',
        data: inquiry,
        url: functionsUrl,
      });

      if (response.status === 200) {
        const updatedInquiry = response.data;
        if (updatedInquiry && updatedInquiry.email && updatedInquiry.message) {
          if (!isNaN(updatedInquiry.agentId)) {
            updatedInquiry.assignedTo = salesAgents[updatedInquiry.agentId];
          }
          inquiry = updatedInquiry;
        }
      }
    } catch (error) {
      // do nothing
    }
    inquiries.push(inquiry);
    context.body = inquiry;
  };
}

function getInquiries(config: ApiConfig) {
  return async (context: any) => {
    context.body = inquiries;
  };
}

function assignInquiry(config: ApiConfig) {
  return async (context: any) => {
    const agent = salesAgents[context.path.agentid];
    const inquiry = inquiries[context.path.inquiry];
    if (agent && inquiry) {
      agent.inquiries.push(inquiry);
      inquiry.assignedTo = agent;
    }
    context.body = salesAgents;
  };
}

function getEditorConfig(config: ApiConfig) {
  return async (context: any) => {
    const decodedAccessToken = context.deocodedAccessToken;
    const userId = decodedAccessToken.sub;
    const admin = getAdmin(userId);

    const settings: any = {
      subscriptionId: admin.company,
      boundaryId: admin.company,
      baseUrl: config.functionsBaseUrl,
    };

    if (process.env.API_AUTHORIZATION_KEY) {
      settings.token = process.env.API_AUTHORIZATION_KEY;
    } else if (context.query['generate-token']) {
      settings.token = await signJwt(
        {
          aud: config.fiveQuartersAudience,
          iss: config.salesAnchorIssuer,
          sub: decodedAccessToken.sub,
        },
        config.fiveQuartersPrivateKey,
        { expiresIn: '1h', algorithm: 'RS256' }
      );
    }

    context.body = settings;
  };
}

function authenticate(config: ApiConfig, authGoogle: AuthGoogle, authAuth0: AuthAuth0) {
  return async (context: any, next: () => void) => {
    let deocodedAccessToken;
    const authorization = context.request.headers.authorization;
    if (authorization) {
      const accessToken = authorization.replace('Bearer ', '');
      deocodedAccessToken = await authGoogle.verifyAccessToken(accessToken);
      if (!deocodedAccessToken) {
        deocodedAccessToken = await authAuth0.verifyAccessToken(accessToken);
      }
    }
    if (!deocodedAccessToken) {
      context.status = 403;
      return;
    }
    context.deocodedAccessToken = deocodedAccessToken;
    await next();
  };
}

// ------------------
// Exported Functions
// ------------------

export function routes(config: ApiConfig) {
  const router = new Router();
  const authGoogle = new AuthGoogle(config);
  const authAuth0 = new AuthAuth0(config);
  const auth = authenticate(config, authGoogle, authAuth0);

  router.post('/login', login(config, authGoogle));
  router.get('/editor', auth, getEditorConfig(config));
  router.get('/agents', auth, getAgents(config));
  router.get('/inquiries', auth, getInquiries(config));
  router.post('/inquiries', auth, generateInquiry(config));
  router.post('/agents/:agentid/inquires/:inquiryid', auth, assignInquiry(config));
  return router.routes();
}
