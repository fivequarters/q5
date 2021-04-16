const httpMock = require('superagent-mock');
import superagent from 'superagent';

import { IOAuthConfig } from '../src/OAuthTypes';

const httpMockStart = (cfg: IOAuthConfig) => {
  const httpMockConfig = [
    {
      pattern: `${cfg.authorizationUrl}(.*)`,
      fixtures: (match: any, params: any, headers: any, context: any) => {
        return { code: 'CODE' };
      },
      get: (match: any, data: any) => {
        const url = new URL(match[0]);
        return {
          body: data,
          header: {
            location: `${url.searchParams.get('redirect_uri')}?code=${data.code}&state=${url.searchParams.get(
              'state'
            )}`,
          },
          status: 302,
        };
      },
    },
    {
      pattern: `${cfg.tokenUrl}(.*)`,
      fixtures: (match: any, params: any, headers: any, context: any) => {
        return {
          access_token: 'ACCESSTOKEN',
          refresh_token: 'REFRESHTOKEN',
          token_type: 'Bearer',
          expires_in: 3600,
        };
      },
      post: (match: any, data: any) => {
        return {
          body: data,
          status: 200,
        };
      },
    },
  ];
  const state = httpMock(superagent, httpMockConfig);
  return () => state.unset();
};

export { httpMockStart };
