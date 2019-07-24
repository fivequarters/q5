import http from 'http';
import https from 'https';
import { request as core, IHttpRequest, IHttpResponse } from './request';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

export async function request(urlOrRequest: string | IHttpRequest): Promise<IHttpResponse> {
  return core(urlOrRequest, httpAgent, httpsAgent);
}

export { IHttpRequest, IHttpResponse };
