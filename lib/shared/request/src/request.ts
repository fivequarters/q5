import axios from 'axios';

// ------------------
// Internal Functions
// ------------------

function getAxiosRequest(httpRequest: IHttpRequest) {
  const axiosRequest = {
    method: httpRequest.method || 'GET',
    url: httpRequest.url,
    headers: httpRequest.headers || {},
    data: httpRequest.data,
    transformResponse: undefined,
  };

  const contentType = axiosRequest.headers['content-type'] || axiosRequest.headers['Content-Type'] || '';

  if (typeof axiosRequest.data === 'string' && !contentType) {
    axiosRequest.headers['content-type'] = 'text/plain;charset=utf-8';
  }
  return axiosRequest;
}

function getHttpResponse(axiosResponse: any, parseJson: boolean = true) {
  const httpResponse = {
    status: axiosResponse.status,
    headers: axiosResponse.headers,
    data: axiosResponse.data || undefined,
  };

  if (parseJson && typeof httpResponse.data === 'string') {
    const contentType = httpResponse.headers['content-type'];
    if (contentType.toLowerCase().indexOf('json') >= 0) {
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
  headers?: { [index: string]: string };
  data?: any;
  parseJson?: boolean;
}

export interface IHttpResponse {
  status: number;
  headers: { [index: string]: string };
  data?: any;
}

// ------------------
// Exported Functions
// ------------------

export async function request(urlOrRequest: string | IHttpRequest): Promise<IHttpResponse> {
  const httpRequest = typeof urlOrRequest === 'string' ? { url: urlOrRequest } : urlOrRequest;
  const axiosRequest = getAxiosRequest(httpRequest);
  const axiosResponse = await axios.request(axiosRequest);
  return getHttpResponse(axiosResponse, httpRequest.parseJson);
}
