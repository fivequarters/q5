import { request } from '@5qtrs/request';

import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

interface IRegistries {
  [registryName: string]: IRegistry;
}

interface IRegistry {
  url: string;
  scopes: string[];
}

interface IEnv {
  [key: string]: string;
}

async function getRegistry(profile: IFusebitExecutionProfile): Promise<IRegistries> {
  /*
    const response: any = await request({
      method: 'GET',
      url: [`${profile.baseUrl}/v1/account/${profile.account}/registry/default`].join(''),
      headers: { Authorization: `bearer ${profile.accessToken}` },
    });
    return response.body as IRegistry;
    */
  // Add an assertion to make sure that the url always ends in a trailing '/'...
  return {
    default: {
      url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/registry/default/npm/`,
      scopes: ['@fusebit', '@testscope'],
    },
  };
}

function getProtoUrl(url: string): string {
  return url.replace(/^http[s]?:/, '');
}

function createEnv(profile: IFusebitExecutionProfile, registries: IRegistries, setDefault: boolean = false): IEnv {
  const env: IEnv = {};

  for (const registry of Object.values(registries)) {
    const protoUrl = getProtoUrl(registry.url);
    env[`npm_config_${protoUrl}:token`] = profile.accessToken;

    registry.scopes.forEach((scope) => {
      env[`npm_config_${scope}:registry`] = registry.url;
    });
    if (setDefault) {
      env.npm_config_registry = registry.url;
      env.npm_config_token = profile.accessToken;
    }
  }

  return env;
}

export { IRegistries, IRegistry, getProtoUrl, getRegistry, createEnv };
