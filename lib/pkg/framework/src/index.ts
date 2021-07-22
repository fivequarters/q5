import { Router, Context, Next } from './Router';
import { Manager, IStorage, IOnStartup, IConfig, InvokeParameters } from './Manager';
import { ConnectorManager, IInstanceConnectorConfig } from './ConnectorManager';
import { Form } from './Form';

import { Handler } from './Handler';

import * as Middleware from './middleware';

// Placeholder object until we have better logging in place.
const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

export {
  Handler,
  Router,
  Router as Integration,
  Router as Connector,
  Form,
  ConnectorManager,
  Manager,
  Context,
  Next,
  IStorage,
  IOnStartup,
  IConfig,
  InvokeParameters,
  Sdk,
  IInstanceConnectorConfig,
  Middleware,
};
