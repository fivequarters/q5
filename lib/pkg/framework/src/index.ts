import { Router, Context, Next } from './Router';
import { Manager, IStorage, IOnStartup } from './Manager';
import { ConnectorManager, IInstanceConnectorConfig } from './ConnectorManager';
import { Form } from './Form';

import { Handler } from './Handler';

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
  Sdk,
  IInstanceConnectorConfig,
};
