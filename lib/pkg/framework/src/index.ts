import { Router as RouterType, Context, Next } from './Router';
import { Manager, IStorage as IStorageInterface, IOnStartup } from './Manager';
import { ConnectorManager, IInstanceConnectorConfig as IInstanceConnectorConfigInterface } from './ConnectorManager';
import * as Storage from './Storage';
import { Form } from './Form';
import { Handler } from './Handler';
import * as Middleware from './middleware';
import IntegrationActivator from './IntegrationActivator';
import * as Tenant from './Tenant';
import { Connector, Integration } from './client/index';

// Objects
const Internal = {
  Handler,
  Router: RouterType,
  Form,
  ConnectorManager,
  Manager,
  Middleware,
  Storage,
  IntegrationActivator,
  Tenant,
};
module Internal {
  export type Router = RouterType;
  export type Handler = typeof Handler;
  export type Form = typeof Form;
  export type ConnectorManager = typeof ConnectorManager;
  export type Manager = typeof Manager;
  export interface IStorage extends IStorageInterface {}
  export type Middleware = typeof Middleware;
  export type Storage = typeof Storage;
  export type IntegrationActivator = typeof IntegrationActivator;
  export type Tenant = typeof Tenant;
  export interface IInstanceConnectorConfig extends IInstanceConnectorConfigInterface {}
}

export { Connector, Integration, Internal, Context, Next, IOnStartup };
