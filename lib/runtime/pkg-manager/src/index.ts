import FusebitRouter, { Context, Next } from './FusebitRouter';
import { FusebitManager, IStorage, IOnStartup } from './FusebitManager';
import connectors, { IConnectorConfig } from './FusebitConnectorManager';

// Placeholder object until we have better logging in place.
const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

export {
  FusebitRouter as default,
  connectors,
  FusebitManager,
  Context,
  Next,
  IStorage,
  IOnStartup,
  Sdk,
  IConnectorConfig,
};
