import FusebitRouter, { Context, Next } from './FusebitRouter';
import { FusebitManager, IStorage, IOnStartup } from './FusebitManager';

// Placeholder object until we have better logging in place.
const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

export { FusebitRouter as default, FusebitManager, Context, Next, IStorage, IOnStartup, Sdk };
