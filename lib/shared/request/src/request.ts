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
    params: httpRequest.query || {},
    transformResponse: undefined,
  };

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
  query?: { [index: string]: string | number | boolean | null | undefined };
  data?: any;
  parseJson?: boolean;
  validStatus?: (status: number) => boolean;
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
  return getHttpResponse(axiosResponse, httpRequest.parseJson, httpRequest.validStatus);
}
