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
  const response: any = await request({
    method: 'GET',
    url: `${profile.baseUrl}/v1/account/${profile.account}/registry/default/`,
    headers: { Authorization: `bearer ${profile.accessToken}` },
  });

  return { default: response.data as IRegistry };
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
