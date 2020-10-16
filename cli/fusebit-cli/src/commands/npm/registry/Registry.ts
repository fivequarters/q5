import { request } from '@5qtrs/request';

import { IText, Text } from '@5qtrs/text';
import { ExecuteService } from '../../../services/ExecuteService';

import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

interface IRegistries {
  [registryName: string]: IRegistry;
}

interface IRegistry {
  url: string;
  scopes: string[];
}

async function getRegistry(profile: IFusebitExecutionProfile): Promise<IRegistries> {
  const response: any = await request({
    method: 'GET',
    url: `${profile.baseUrl}/v1/account/${profile.account}/registry/default/`,
    headers: { Authorization: `bearer ${profile.accessToken}` },
  });

  return { default: response.data as IRegistry };
}

async function putRegistry(profile: IFusebitExecutionProfile, scopes: string[]): Promise<IRegistries> {
  const response: any = await request({
    method: 'PUT',
    url: `${profile.baseUrl}/v1/account/${profile.account}/registry/default/`,
    headers: { Authorization: `bearer ${profile.accessToken}` },
    data: { scopes },
  });

  return getRegistry(profile);
}

function getProtoUrl(url: string): string {
  return url.replace(/^http[s]?:/, '');
}

async function printRegistries(executeService: ExecuteService, registries: IRegistries) {
  for (const [name, registry] of Object.entries(registries)) {
    await executeService.result(
      `${name === 'default' ? 'Mapped Scopes' : name}`,
      Text.create(`${(registry as IRegistry).scopes.join(', ')}`)
    );
  }
}

export { IRegistries, IRegistry, getProtoUrl, getRegistry, putRegistry, printRegistries };
