import { request as core, IHttpRequest, IHttpResponse } from './request';

export async function request(urlOrRequest: string | IHttpRequest): Promise<IHttpResponse> {
  return core(urlOrRequest, undefined, undefined);
}

export { IHttpRequest, IHttpResponse };
