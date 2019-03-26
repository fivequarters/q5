import serverless from 'serverless-http';
import { app } from './app';
import { ApiConfig } from './ApiConfig';

let application: any;

async function getApplication(environment: string) {
  if (!application) {
    const config = await ApiConfig.create(environment);
    // @ts-ignores
    application = serverless(app(config));
  }
  return application;
}

export async function handler(event: any, context: any) {
  const application = await getApplication('lambda');
  return await application(event, context);
}
