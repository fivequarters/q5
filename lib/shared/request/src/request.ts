import axios from 'axios';

// ------------------
// Internal Functions
// ------------------

function getAxiosRequest(httpRequest: IHttpRequest, httpAgent: any, httpsAgent: any) {
  const axiosRequest: any = {
    method: httpRequest.method || 'GET',
    url: httpRequest.url,
    headers: httpRequest.headers || {},
    data: httpRequest.data,
    params: httpRequest.query || {},
    transformResponse: undefined,
    validateStatus: () => true,
    maxRedirects: httpRequest.maxRedirects === undefined ? 5 : httpRequest.maxRedirects,
  };
  if (httpRequest.keepAlive !== false) {
    if (httpAgent) {
      axiosRequest.httpAgent = httpAgent;
    }
    if (httpsAgent) {
      axiosRequest.httpsAgent = httpsAgent;
    }
  }

  const contentType = axiosRequest.headers['content-type'] || axiosRequest.headers['Content-Type'] || '';

  if (typeof axiosRequest.data === 'string' && !contentType) {
    axiosRequest.headers['content-type'] = 'text/plain;charset=utf-8';
  }
  return axiosRequest;
}

function getHttpResponse(axiosResponse: any, parseJson: boolean = true, validStatus?: (status: number) => boolean) {
  const httpResponse = {
    status: axiosResponse.status,
    headers: axiosResponse.headers,
    data: axiosResponse.data || undefined,
    request: axiosResponse.config,
  };

  if (validStatus !== undefined) {
    const isValid = validStatus(httpResponse.status);
    if (!isValid) {
      const message = `Request failed with response status code: ${httpResponse.status}`;
      throw new Error(message);
    }
  }

  if (parseJson && typeof httpResponse.data === 'string') {
    const contentType = httpResponse.headers['content-type'];
    if (contentType && contentType.toLowerCase().indexOf('json') >= 0) {
      try {
        httpResponse.data = JSON.parse(httpResponse.data);
      } catch (error) {
        // do nothing
      }
    }
  }

  return httpResponse;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IHttpRequest {
  method?: string;
  url: string;
  headers?: { [index: string]: string | undefined };
  query?: { [index: string]: string | number | boolean | null | undefined };
  data?: any;
  parseJson?: boolean;
  keepAlive?: boolean;
  maxRedirects?: number;
  validStatus?: (status: number) => boolean;
}

export interface IHttpResponse {
  status: number;
  headers: { [index: string]: string };
  data?: any;
  request: any;
}

// ------------------
// Exported Functions
// ------------------

export async function request(
  urlOrRequest: string | IHttpRequest,
  httpAgent: any,
  httpsAgent: any
): Promise<IHttpResponse> {
  const httpRequest = typeof urlOrRequest === 'string' ? { url: urlOrRequest } : urlOrRequest;
  const axiosRequest = getAxiosRequest(httpRequest, httpAgent, httpsAgent);

  let axiosResponse;
  let retry = 0;
  while (!axiosResponse) {
    try {
      axiosResponse = await axios.request(axiosRequest);
    } catch (error) {
      throw error;
      if (error.code !== 'ENOTFOUND' || retry >= 4) {
        throw error;
      }
      retry++;
      await new Promise((resolve) => setTimeout(resolve, Math.pow(10, retry)));
    }
  }

  return getHttpResponse(axiosResponse, httpRequest.parseJson, httpRequest.validStatus);
}
