import { Router, Context, Next } from './Router';
import { Manager, IStorage, IOnStartup } from './Manager';
import { connectorManager, IInstanceConnectorConfig } from './ConnectorManager';
import { Form } from './Form';

// Placeholder object until we have better logging in place.
const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

export {
  Router,
  Form,
  connectorManager as connectors,
  Manager,
  Context,
  Next,
  IStorage,
  IOnStartup,
  Sdk,
  IInstanceConnectorConfig,
};
