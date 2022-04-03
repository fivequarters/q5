import { request } from '@5qtrs/request';

import { Text } from '@5qtrs/text';
import { ExecuteService } from '../../../../services/ExecuteService';

import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

interface IRegistries {
  [registryName: string]: IRegistry;
}

interface IRegistry {
  url: string;
  scopes: string[];
}

async function getRegistry(profile: IFusebitExecutionProfile): Promise<IRegistries> {
  const headers = { Authorization: `bearer ${profile.accessToken}` };
  ExecuteService.addCommonHeaders(headers);

  const response: any = await request({
    method: 'GET',
    url: `${profile.baseUrl}/v1/account/${profile.account}/registry/default/`,
    headers,
  });

  return { default: response.data as IRegistry };
}

async function putRegistry(
  profile: IFusebitExecutionProfile,
  executeService: ExecuteService,
  scopes: string[]
): Promise<IRegistries> {
  const headers = { Authorization: `bearer ${profile.accessToken}` };
  ExecuteService.addCommonHeaders(headers);
  const response: any = await request({
    method: 'PUT',
    url: `${profile.baseUrl}/v1/account/${profile.account}/registry/default/`,
    headers,
    data: { scopes },
  });

  if (response.status !== 200) {
    await executeService.error(`Error`, response.data.message);
    return {};
  }

  return getRegistry(profile);
}

function getProtoUrl(url: string): string {
  return url.replace(/^http[s]?:/i, '');
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
