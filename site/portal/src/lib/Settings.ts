import { FusebitError } from "../components/ErrorBoundary";
import Superagent from "superagent";

export interface IFusebitAuth {
  access_token: string;
  expires_at: number;
  [property: string]: any;
}

function isIFusebitAuth(o: any): o is IFusebitAuth {
  return o && typeof o === "object" && typeof o.access_token === "string" && typeof o.expires_at === "number";
}

export interface IFusebitAuthError {
  error: string;
  error_description: string;
  [property: string]: any;
}

function isIFusebitAuthError(o: any): o is IFusebitAuth {
  return o && typeof o === "object" && typeof o.error === "string" && typeof o.error_description === "string";
}

export interface IFusebitProfile {
  id: string;
  displayName: string;
  baseUrl: string;
  account: string;
  subscription?: string;
  boundary?: string;
  function?: string;
  oauth: {
    webAuthorizationUrl: string;
    webClientId: string;
    webLogoutUrl?: string;
    deviceAuthorizationUrl?: string;
    deviceClientId?: string;
    tokenUrl?: string;
  };
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

function isIFusebitProfile(o: any): o is IFusebitProfile {
  return (
    o &&
    typeof o === "object" &&
    typeof o.id === "string" &&
    typeof o.displayName === "string" &&
    typeof o.baseUrl === "string" &&
    typeof o.account === "string" &&
    (o.subscription === undefined || typeof o.subscription === "string") &&
    (o.boundary === undefined || typeof o.boundary === "string") &&
    typeof o.oauth === "object" &&
    typeof o.oauth.webAuthorizationUrl === "string" &&
    typeof o.oauth.webClientId === "string" &&
    (o.oauth.webLogoutUrl === undefined || typeof o.oauth.webLogoutUrl === "string")
  );
}

export interface IFusebitSettings {
  profiles: IFusebitProfile[];
  currentProfile: string;
}

function isIFusebitSettings(o: any): o is IFusebitSettings {
  return (
    o &&
    typeof o === "object" &&
    typeof o.currentProfile === "string" &&
    Array.isArray(o.profiles) &&
    o.profiles.length ===
      o.profiles.reduce((count: number, profile: any) => (count += isIFusebitProfile(profile) ? 1 : 0), 0)
  );
}

function getExternalSettingsUrl(): string {
  const token = (window.location.hash || "").substring(1);
  if (token.match(/^https:\/\//i)) {
    return token;
  } else {
    const [path, sourceProfile] = token.split("#");
    const [organization, repository, file, rest] = path.split("/");
    if (organization && repository && !rest) {
      return `https://raw.githubusercontent.com/${organization}/${repository}/master/${
        file || "profiles.json"
      }${sourceProfile ? "#" + sourceProfile : ""}`;
    }
    throw new FusebitError("Unable to initialize Fusebit Portal", {
      details: [
        "The hash portion of the URL must specify the location of Fusebit Settings. ",
        "Please ask your Fusebit administrator for instructions. ",
        "You can provide either a valid HTTPS URL or a ",
        "{organization}/{repository}[/{file}][#{profile-name}] string that identifies an ",
        "existing file in a public Github repository."
      ].join("")
    });
  }
}

async function getExternalSettings(url: string): Promise<IFusebitSettings> {
  const [serverUrl, sourceProfile] = url.split("#");
  let settingsResponse: any;
  try {
    settingsResponse = await Superagent.get(serverUrl);
  } catch (e) {
    throw new FusebitError("Unable to initialize Fusebit Portal", {
      details: [
        `Unable to obtain Fusebit settings from ${serverUrl}. `,
        `Please ask your Fusebit administrator for instructions.`
      ].join("")
    });
  }
  if (settingsResponse.status !== 200) {
    throw new FusebitError("Unable to initialize Fusebit Portal", {
      details: [
        `Error obtaining Fusebit settings from ${serverUrl}. HTTP status code is ${settingsResponse.status}. `,
        `Please ask your Fusebit administrator for instructions.`
      ].join("")
    });
  }
  let settings: any = settingsResponse.body || settingsResponse.text;
  if (typeof settings !== "object") {
    try {
      settings = JSON.parse(settings);
    } catch (e) {
      throw new FusebitError("Unable to initialize Fusebit Portal", {
        details: [
          `Error obtaining Fusebit settings from ${serverUrl}. `,
          `Response data is not a JSON object. `,
          `Please ask your Fusebit administrator for instructions.`
        ].join("")
      });
    }
  }
  if (!isIFusebitSettings(settings)) {
    throw new FusebitError("Unable to initialize Fusebit Portal", {
      details: [
        `The data obtained from ${serverUrl} is not in the format required by Fusebit Settings. `,
        `Please ask your Fusebit administrator for instructions.`
      ].join("")
    });
  }
  if (settings.profiles.length === 0) {
    throw new FusebitError("Unable to initialize Fusebit Portal", {
      details: [
        `The Fusebit Settings from ${serverUrl} do not specify any profiles. `,
        `Please ask your Fusebit administrator for instructions.`
      ].join("")
    });
  }
  if (sourceProfile && settings.currentProfile !== sourceProfile) {
    for (const p of settings.profiles) {
      if (sourceProfile === p.id) {
        settings.currentProfile = sourceProfile;
        break;
      }
    }
    if (settings.currentProfile !== sourceProfile) {
      throw new FusebitError("Unable to initialize Fusebit Portal", {
        details: [
          `The Fusebit Settings from ${serverUrl} do not specify the requested profile ${sourceProfile}. `,
          `Available profiles are: ${settings.profiles.map(p => p.id).join(", ")}. `,
          `Please ask your Fusebit administrator for instructions.`
        ].join("")
      });
    }
  }
  return settings;
}

function setLocalSettings(settings: IFusebitSettings) {
  window.localStorage.setItem("fusebit", JSON.stringify(settings));
}

function getLocalSettings(): IFusebitSettings | undefined {
  let settingsSerialized = window.localStorage.getItem("fusebit");
  if (settingsSerialized) {
    try {
      let settings = JSON.parse(settingsSerialized);
      if (!isIFusebitSettings(settings)) {
        throw new Error("Not fusebit settings");
      }
      return settings;
    } catch (e) {
      console.warn(
        "Unable to parse Fusebit Settings from local storage or schema mismatch. Ignoring local storage settings."
      );
      return undefined;
    }
  }
  return undefined;
}

function indexOfProfile(settings: IFusebitSettings, id: string): number {
  for (let i = 0; i < settings.profiles.length; i++) {
    if (settings.profiles[i].id === id) return i;
  }

  return -1;
}

export {
  getExternalSettingsUrl,
  getExternalSettings,
  isIFusebitSettings,
  setLocalSettings,
  getLocalSettings,
  // IFusebitSettings, - exported directly above due to TS error otherwise
  // IFusebitProfile,
  indexOfProfile,
  isIFusebitAuth,
  isIFusebitAuthError
};
