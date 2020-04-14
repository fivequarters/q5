import React, { useEffect } from "react";
import {
  getLocalSettings,
  setLocalSettings,
  IFusebitProfile,
  indexOfProfile,
  defaultFusebitUISettings
} from "../lib/Settings";
import { getMe, initUser } from "../lib/Fusebit";
import { getBookmark, setBookmark } from "../lib/Bookmark";
import parseUrl from "url-parse";
import { FusebitError } from "./ErrorBoundary";
import { decodeJwt } from "@5qtrs/jwt";

const FusebitAuthStateKey = "fusebitAuthState";

type ProfileProps = {
  profile: IFusebitProfile;
  logout: () => Promise<void>;
  saveProfile: (profile: IFusebitProfile) => void;
};

const ProfileContext = React.createContext<Partial<ProfileProps>>({});

function ProfileProvider(props: any) {
  let settings = getLocalSettings();
  let [empty, seg1, seg2] = window.location.pathname.split("/");
  const accountId = (empty === "" && seg1 === "accounts" && seg2) || undefined;
  const isJoinStepOne = seg1 === "join" && !seg2;
  const isJoinStepTwo = seg1 === "joining" && !seg2;

  // If a new user is joining, ensure the profile from the init token is stored in the settings

  if (isJoinStepOne) {
    const initToken = decodeJwt(window.location.hash.substring(1));
    if (!initToken || !initToken.profile) {
      throw new FusebitError("Invalid invitation link", {
        details: `The invitation link you are using is invalid. Ask your administrator to generate a new invitation link.`
      });
    }
    if (!settings || !Array.isArray(settings.profiles)) {
      settings = {
        profiles: [initToken.profile],
        currentProfile: initToken.profile.id,
        ui: defaultFusebitUISettings
      };
    } else {
      let matchingProfile: number = -1;
      for (let i = 0; i < settings.profiles.length; i++) {
        if (settings.profiles[i].id === initToken.profile.id) {
          matchingProfile = i;
          break;
        }
      }
      if (matchingProfile === -1) {
        settings.profiles.push(initToken.profile);
      } else {
        settings.profiles[matchingProfile] = initToken.profile;
      }
      settings.currentProfile = initToken.profile.id;
    }
    setLocalSettings(settings);
  }

  // Determine selected profile based on accountId from URL path or selected profile from local settings

  let selectedProfile: IFusebitProfile | undefined;
  if (settings) {
    const currentProfile = settings.currentProfile;
    if (accountId) {
      selectedProfile = settings.profiles.reduce(
        (selected: IFusebitProfile | undefined, current: IFusebitProfile) => {
          if (current.account === accountId && current.id === currentProfile) {
            // Profile that matches both accountId and locally selected profile id wins
            return current;
          } else if (!selected && current.account === accountId) {
            // Othweise, profile that matches just accountId wins
            return current;
          } else {
            return selected;
          }
        },
        undefined
      );
    } else {
      selectedProfile = settings.profiles.reduce(
        (selected: IFusebitProfile | undefined, current: IFusebitProfile) => {
          if (current.id === currentProfile) {
            return current;
          } else {
            return selected;
          }
        },
        undefined
      );
    }
    if (!selectedProfile && !accountId) {
      // If we don't care about accountId and are still undecided about profile, pick the first one
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
        if (isJoinStepTwo) {
          try {
            await initUser(profile, window.location.hash.substring(1));
          } catch (error) {
            me = {
              accountId: profile.account,
              error: new FusebitError("Error joining the portal", {
                details: [`Unable to join the portal:`, error.message].join(" ")
              })
            };
          }
        }
        if (!me) {
          try {
            me = { accountId: profile.account, ...(await getMe(profile)) };
          } catch (error) {
            me = {
              accountId: profile.account,
              error: new FusebitError("Error accessing the Fusebit service", {
                details: [
                  `Unable to access the Fusebit service to obtain information about your permissions:`,
                  error.message
                ].join(" ")
              })
            };
          }
        }
        if (!cancelled) {
          setProfile({ ...profile, me });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [profile, isJoinStepTwo]);

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
    login(
      profile,
      isJoinStepOne
        ? `/joining${window.location.hash}`
        : window.location.pathname
    );
    return <></>;
  }

  if (profile && !profile.me) {
    return <></>;
  }

  if (profile) {
    if (profile.me && profile.me.error) {
      throw profile.me.error;
    }

    const saveProfileImpl = (profile: IFusebitProfile) => {
      settings = getLocalSettings();
      if (settings) {
        settings.profiles[indexOfProfile(settings, profile.id)] = {
          ...profile
        };
        setLocalSettings(settings);
      }
    };

    let logoutProfile = profile;
    const logout = () => {
      delete logoutProfile.auth;
      delete logoutProfile.me;
      saveProfileImpl(logoutProfile);
      if (logoutProfile.oauth.webLogoutUrl) {
        window.location.href = logoutProfile.oauth.webLogoutUrl;
      } else {
        setProfile({ ...logoutProfile });
      }
    };

    const saveProfile = (profile: IFusebitProfile) => {
      saveProfileImpl(profile);
      setProfile({ ...profile });
    };

    return (
      <ProfileContext.Provider
        value={{ logout, profile, saveProfile }}
        {...props}
      />
    );
  } else {
    throw new Error("User is not logged");
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
