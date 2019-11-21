import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getLocalSettings,
  setLocalSettings,
  IFusebitProfile,
  indexOfProfile
} from "../lib/Settings";
import { getMe } from "../lib/Fusebit";
import { getBookmark, setBookmark } from "../lib/Bookmark";
import parseUrl from "url-parse";
import { FusebitError } from "./ErrorBoundary";

const FusebitAuthStateKey = "fusebitAuthState";

type ProfileProps = {
  profile: IFusebitProfile;
  logout: () => Promise<void>;
};

const ProfileContext = React.createContext<Partial<ProfileProps>>({});

function ProfileProvider(props: any) {
  const params: any = useParams();
  let settings = getLocalSettings();

  // Determine selected profile

  let selectedProfile: IFusebitProfile | undefined;
  if (settings) {
    const currentProfile = settings.currentProfile;
    selectedProfile = settings.profiles.reduce(
      (selected: IFusebitProfile | undefined, current: IFusebitProfile) =>
        selected ||
        (current.account === params.accountId || current.id === currentProfile
          ? current
          : undefined),
      undefined
    );
    if (!selectedProfile) {
      selectedProfile = settings.profiles[0];
    }
    if (selectedProfile && selectedProfile.id !== settings.currentProfile) {
      settings.currentProfile = selectedProfile.id;
      setLocalSettings(settings);
    }
  }

  let [profile, setProfile] = React.useState(selectedProfile);

  // Process authentication callback

  if (
    profile &&
    profile.auth &&
    profile.auth.expires_at - Date.now() < 30 * 60 * 1000
  ) {
    delete profile.auth;
    delete profile.me;
  }

  let auth: any;
  if (profile && settings) {
    auth = processAuthenticationCallback();
    if (auth && !auth.error) {
      delete profile.me;
      settings.profiles[indexOfProfile(settings, profile.id)] = {
        ...profile,
        auth
      };
      setLocalSettings(settings);
      profile = settings.profiles[indexOfProfile(settings, profile.id)];
      let bookmark = getBookmark();
      if (bookmark) {
        window.location.href = bookmark;
      }
    }
  }

  // Get "me" information from Fusebit

  useEffect(() => {
    if (profile && profile.auth && !profile.me) {
      let cancelled = false;
      (async () => {
        let me;
        try {
          me = { accountId: profile.account, ...(await getMe(profile)) };
        } catch (error) {
          me = { accountId: profile.account, error };
        }
        if (!cancelled) {
          setProfile({ ...profile, me });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [profile]);

  if (!settings) {
    throw new FusebitError("Fusebit Portal is not initialized", {
      details: [
        `Fusebit Portal must be initialized before being used. `,
        `Please contact your Fusebit administractor for instructions.`
      ].join("")
    });
  }

  if (auth && auth.error) {
    throw new FusebitError("Authorization error", {
      details: `You are not authorized to access the Fusebit Portal. Error '${auth.error ||
        "N/A"}'. Error details: '${auth.error_description}'.`
    });
  }

  if (profile && !profile.auth) {
    // no access token or access token expires in less than 30 mins, re-authenticate
    login(profile, window.location.pathname);
    return <></>;
  }

  if (profile && !profile.me) {
    return <></>;
  }

  if (profile) {
    let logoutProfile = profile;
    const logout = () => {
      delete logoutProfile.auth;
      delete logoutProfile.me;
      settings = getLocalSettings();
      if (settings) {
        settings.profiles[indexOfProfile(settings, logoutProfile.id)] = {
          ...logoutProfile
        };
        setLocalSettings(settings);
      }
      if (logoutProfile.oauth.webLogoutUrl) {
        window.location.href = logoutProfile.oauth.webLogoutUrl;
      } else {
        setProfile({ ...logoutProfile });
      }
    };

    return <ProfileContext.Provider value={{ logout, profile }} {...props} />;
  } else {
    throw new Error("User is not logged");
    // return <ProfileContext.Provider value={{}} {...props} />;
  }
}

const useProfile = () => React.useContext(ProfileContext) as ProfileProps;

function login(profile: IFusebitProfile, bookmark: string) {
  let url = parseUrl(profile.oauth.webAuthorizationUrl, true);
  let state = Math.floor(Math.random() * 999999).toString(32);
  //@ts-ignore
  url.query = {
    ...url.query,
    response_type: "token",
    client_id: profile.oauth.webClientId,
    redirect_uri: `${window.location.protocol}//${window.location.host}`,
    audience: profile.baseUrl,
    state
  };
  window.localStorage.setItem(FusebitAuthStateKey, state);
  setBookmark(bookmark);
  window.location.href = url.toString();
}

function processAuthenticationCallback(): any {
  let expectedState = window.localStorage.getItem(FusebitAuthStateKey);
  if (!expectedState) {
    return undefined;
  }
  let hash: any =
    window.location.hash[0] === "#"
      ? parse(window.location.hash.substring(1))
      : {};
  if (hash.expires_in) {
    hash.expires_at = Date.now() + +hash.expires_in * 1000;
    delete hash.expires_in;
  }
  if (hash.access_token) {
    window.localStorage.removeItem(FusebitAuthStateKey);
    if (expectedState !== hash.state) {
      hash = {
        error: "State parameter mismatch",
        error_description:
          "Integrity of the login transaction cannot be validated. Try again."
      };
    }
  }
  return hash.error || hash.access_token ? hash : undefined;
}

function parse(queryString: string) {
  let tokens = queryString.split("&");
  let result: any = {};
  tokens.forEach(t => {
    let [k, v] = t.split("=");
    result[k] = decodeURIComponent(v);
  });
  return result;
}

export { ProfileProvider, useProfile };
