import { Router, Context, Next } from './Router';
import { Manager, IStorage, IOnStartup } from './Manager';
import { ConnectorManager, IInstanceConnectorConfig } from './ConnectorManager';
import { Form } from './Form';

// Placeholder object until we have better logging in place.
const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

export { Router, Form, ConnectorManager, Manager, Context, Next, IStorage, IOnStartup, Sdk, IInstanceConnectorConfig };
