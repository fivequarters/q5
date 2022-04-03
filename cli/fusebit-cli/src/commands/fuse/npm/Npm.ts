import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

import { getProtoUrl, IRegistries } from './registry/Registry';

interface IEnv {
  [key: string]: string;
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

export { createEnv };
