import serverless from 'serverless-http';
import { app } from './app';
import { ServiceConfig } from './ServiceConfig';

let application: any;

async function getApplication(environment: string) {
  if (!application) {
    const config = await ServiceConfig.create(environment);
    // @ts-ignore
    application = serverless(app(config));
  }
  return application;
}

export async function handler(event: any, context: any) {
  const application = await getApplication('lambda');
  return await application(event, context);
}
