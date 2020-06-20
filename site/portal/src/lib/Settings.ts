import { FusebitError } from '../components/ErrorBoundary';
import { Catalog, isCatalog } from './CatalogTypes';
import Superagent from 'superagent';

export interface IFusebitAuth {
  access_token: string;
  expires_at: number;
  [property: string]: any;
}

function isIFusebitAuth(o: any): o is IFusebitAuth {
  return o && typeof o === 'object' && typeof o.access_token === 'string' && typeof o.expires_at === 'number';
}

export interface IFusebitAuthError {
  error: string;
  error_description: string;
  [property: string]: any;
}

function isIFusebitAuthError(o: any): o is IFusebitAuth {
  return o && typeof o === 'object' && typeof o.error === 'string' && typeof o.error_description === 'string';
}

// Profile settings stored in configuration and applicable to all users
export interface IFusebitConfigProfile {
  id: string;
  displayName: string;
  baseUrl: string;
  account: string;
  subscription?: string;
  boundary?: string;
  function?: string;
  catalog?: string | Catalog;
  oauth: {
    webAuthorizationUrl: string;
    webClientId: string;
    webLogoutUrl?: string;
    deviceAuthorizationUrl?: string;
    deviceClientId?: string;
    tokenUrl?: string;
  };
}

export interface IFusebitTenant {
  profiles: IFusebitConfigProfile[];
  defaultProfile?: string;
}

export function isIFusebitTenant(o: any): o is IFusebitTenant {
  return (
    o &&
    typeof o === 'object' &&
    Array.isArray(o.profiles) &&
    !o.profiles.find((p: any) => !isIFusebitConfigProfile(p)) &&
    (o.defaultProfile === undefined || typeof o.defaultProfile === 'string')
  );
}

export interface IFusebitConfig {
  tenants: {
    [key: string]: IFusebitTenant;
  };
}

export function isIFusebitConfig(o: any): o is IFusebitConfig {
  return (
    o &&
    typeof o === 'object' &&
    o.tenants &&
    typeof o.tenants === 'object' &&
    !Object.keys(o.tenants).find((t: any) => !isIFusebitTenant(o.tenants[t]))
  );
}

// Profile settings stored in local storage and applicable to logged in user
export interface IFusebitUserProfile {
  id: string;
  subscription?: string;
  boundary?: string;
  function?: string;
  auth?: IFusebitAuth | IFusebitAuthError;
  me?: {
    error?: any;
    accountId: string;
    id: string;
    firstName?: string;
    lastName?: string;
    primaryEmail?: string;
    identities: [{ issuerId: string; subject: string }];
    access: {
      allow: [{ action: string; resource: string }];
    };
    can: {
      audit: {
        get: boolean;
      };
      user: {
        add: boolean;
        get: boolean;
        update: boolean;
        delete: boolean;
        init: boolean;
      };
      client: {
        add: boolean;
        get: boolean;
        update: boolean;
        delete: boolean;
        init: boolean;
      };
      issuer: {
        add: boolean;
        get: boolean;
        update: boolean;
        delete: boolean;
      };
    };
  };
}

// Runtime representation of the profile that combines config and per-user profile information
export interface IFusebitProfile extends IFusebitConfigProfile, IFusebitUserProfile {}

export function isIFusebitConfigProfile(o: any): o is IFusebitConfigProfile {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.id === 'string' &&
    typeof o.displayName === 'string' &&
    typeof o.baseUrl === 'string' &&
    typeof o.account === 'string' &&
    (o.catalog === undefined || typeof o.catalog === 'string' || isCatalog(o)) &&
    (o.subscription === undefined || typeof o.subscription === 'string') &&
    (o.boundary === undefined || typeof o.boundary === 'string') &&
    typeof o.oauth === 'object' &&
    typeof o.oauth.webAuthorizationUrl === 'string' &&
    typeof o.oauth.webClientId === 'string' &&
    (o.oauth.webLogoutUrl === undefined || typeof o.oauth.webLogoutUrl === 'string')
  );
}

export function isIFusebitUserProfile(o: any): o is IFusebitProfile {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.id === 'string' &&
    (o.subscription === undefined || typeof o.subscription === 'string') &&
    (o.boundary === undefined || typeof o.boundary === 'string') &&
    (o.auth === undefined || isIFusebitAuth(o.auth)) &&
    (o.me === undefined || typeof o.me === 'object')
  );
}

export function isIFusebitProfile(o: any): o is IFusebitProfile {
  return isIFusebitConfigProfile(o) && isIFusebitUserProfile(o);
}

export interface IFusebitUISettings {
  tableRowsPerPage: number;
  utcTime: boolean;
}

export const defaultFusebitUISettings: IFusebitUISettings = {
  tableRowsPerPage: 10,
  utcTime: false,
};

export interface IFusebitLocalSettings {
  profiles: IFusebitUserProfile[];
  currentProfile: string;
  ui: IFusebitUISettings;
}

export interface IFusebitSettings extends IFusebitLocalSettings {
  profiles: IFusebitProfile[];
}

function isIFusebitSettings(o: any): o is IFusebitSettings {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.currentProfile === 'string' &&
    Array.isArray(o.profiles) &&
    o.profiles.length ===
      o.profiles.reduce((count: number, profile: any) => (count += isIFusebitProfile(profile) ? 1 : 0), 0) &&
    typeof o.ui === 'object' &&
    typeof o.ui.tableRowsPerPage === 'number' &&
    typeof o.ui.utcTime === 'boolean'
  );
}

function isIFusebitLocalSettings(o: any): o is IFusebitLocalSettings {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.currentProfile === 'string' &&
    Array.isArray(o.profiles) &&
    o.profiles.length ===
      o.profiles.reduce((count: number, profile: any) => (count += isIFusebitUserProfile(profile) ? 1 : 0), 0) &&
    typeof o.ui === 'object' &&
    typeof o.ui.tableRowsPerPage === 'number' &&
    typeof o.ui.utcTime === 'boolean'
  );
}

async function getFusebitConfig(): Promise<IFusebitTenant> {
  // Determine tenant

  //@ts-ignore - window.fusebitPortal is injected in index.html
  const domainSuffixIndex = window.location.hostname.indexOf(`.${window.fusebitPortal.domain}`);
  //@ts-ignore
  const tenant =
    //@ts-ignore
    (domainSuffixIndex === window.location.hostname.length - window.fusebitPortal.domain.length - 1 &&
      //@ts-ignore
      window.location.hostname.substring(0, domainSuffixIndex)) ||
    'default';
  //@ts-ignore
  const url = `${window.fusebitPortal.config}?tenant=${encodeURIComponent(tenant)}`;

  // Load config

  let response: any;
  try {
    response = await Superagent.get(url);
  } catch (e) {
    throw new FusebitError('Unable to get configuration of the Fusebit Portal', {
      details: [
        `Unable to obtain Fusebit configuration from ${url}. `,
        `Please ask your Fusebit administrator for assistance.`,
      ].join(''),
    });
  }
  if (response.status !== 200) {
    throw new FusebitError('Unable to get configuration of the Fusebit Portal', {
      details: [
        `Error obtaining Fusebit configuration from ${url}. HTTP status code is ${response.status}. `,
        `Please ask your Fusebit administrator for assistance.`,
      ].join(''),
    });
  }
  let settings: any = response.body || response.text;
  if (typeof settings !== 'object') {
    try {
      settings = JSON.parse(settings);
    } catch (e) {
      throw new FusebitError('Unable to get configuration of the Fusebit Portal', {
        details: [
          `Error obtaining Fusebit configuration from ${url}. `,
          `Response data is not a JSON object. `,
          `Please ask your Fusebit administrator for assistance.`,
        ].join(''),
      });
    }
  }
  if (!isIFusebitConfig(settings)) {
    throw new FusebitError('Unable to get configuration of the Fusebit Portal', {
      details: [
        `The data obtained from ${url} is not in the format required by Fusebit config. `,
        `Please ask your Fusebit administrator for assistance.`,
      ].join(''),
    });
  }
  if (!settings.tenants[tenant]) {
    throw new FusebitError('Unable to get configuration of the Fusebit Portal', {
      details: [
        `The Fusebit configuration from ${url} do not specify configuration for tenant '${tenant}'. `,
        `Please ask your Fusebit administrator for assistance.`,
      ].join(''),
    });
  }
  return settings.tenants[tenant];
}

function setLocalSettings(settings: IFusebitLocalSettings) {
  let redux: IFusebitLocalSettings = {
    currentProfile: settings.currentProfile,
    ui: settings.ui,
    profiles: settings.profiles.map(p => ({
      id: p.id,
      subscription: p.subscription,
      boundary: p.boundary,
      function: p.function,
      auth: p.auth,
    })),
  };
  window.localStorage.setItem('fusebit', JSON.stringify(redux));
}

function setCurrentProfile(id: string) {
  const settings = getLocalSettings();
  if (settings) {
    settings.currentProfile = id;
    setLocalSettings(settings);
  }
}

function getLocalSettings(): IFusebitLocalSettings | undefined {
  let settingsSerialized = window.localStorage.getItem('fusebit');
  if (settingsSerialized) {
    try {
      let settings = JSON.parse(settingsSerialized);
      settings.ui = { ...defaultFusebitUISettings, ...settings.ui };
      if (!isIFusebitLocalSettings(settings)) {
        throw new Error('Not fusebit settings');
      }
      return settings;
    } catch (e) {
      console.warn(
        'Unable to parse Fusebit Settings from local storage or schema mismatch. Ignoring local storage settings.'
      );
      return undefined;
    }
  }
  return undefined;
}

function getUISettings(): IFusebitUISettings {
  const settings = getLocalSettings();
  return (settings && settings.ui) || { ...defaultFusebitUISettings };
}

function setUISettings(ui: IFusebitUISettings) {
  const settings = getLocalSettings();
  if (settings) {
    settings.ui = ui;
    setLocalSettings(settings);
  } else {
    setLocalSettings({ ui, profiles: [], currentProfile: '' });
  }
}

function indexOfProfile(settings: IFusebitLocalSettings, id: string): number {
  for (let i = 0; i < settings.profiles.length; i++) {
    if (settings.profiles[i].id === id) return i;
  }

  return -1;
}

export {
  getFusebitConfig,
  isIFusebitSettings,
  setLocalSettings,
  getLocalSettings,
  // IFusebitSettings, - exported directly above due to TS error otherwise
  // IFusebitProfile,
  indexOfProfile,
  isIFusebitAuth,
  isIFusebitAuthError,
  getUISettings,
  setUISettings,
  setCurrentProfile,
};
