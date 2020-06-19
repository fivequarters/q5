import React, { useEffect } from 'react';
import {
  getLocalSettings,
  setLocalSettings,
  IFusebitProfile,
  IFusebitUserProfile,
  indexOfProfile,
  defaultFusebitUISettings,
  IFusebitSettings,
} from '../lib/Settings';
import { getMe, initUser } from '../lib/Fusebit';
import { getBookmark, setBookmark } from '../lib/Bookmark';
import parseUrl from 'url-parse';
import { FusebitError } from './ErrorBoundary';
import { decodeJwt } from '@5qtrs/jwt';
import { useConfig } from './ConfigProvider';

const FusebitAuthStateKey = 'fusebitAuthState';

type ProfileProps = {
  profile: IFusebitProfile;
  settings: IFusebitSettings;
  logout: () => Promise<void>;
  saveProfile: (profile: IFusebitUserProfile) => void;
};

const ProfileContext = React.createContext<Partial<ProfileProps>>({});

function ProfileProvider(props: any) {
  const [config] = useConfig();
  let [empty, seg1, seg2] = window.location.pathname.split('/');
  const accountId = (empty === '' && seg1 === 'accounts' && seg2) || undefined;
  const isJoinStepOne = seg1 === 'join' && !seg2;
  const isJoinStepTwo = seg1 === 'joining' && !seg2;

  // Define effective settings by adding local user setting information (if present) to the loaded configuration

  const localSettings = getLocalSettings();
  let settings: IFusebitSettings;
  const mergedProfiles: IFusebitProfile[] = [...config.profiles];
  if (localSettings) {
    config.profiles.forEach((configProfile, k) => {
      if (localSettings) {
        const i = indexOfProfile(localSettings, configProfile.id);
        if (i >= 0) {
          mergedProfiles[k].auth = localSettings.profiles[i].auth;
          mergedProfiles[k].me = localSettings.profiles[i].me;
          mergedProfiles[k].subscription = localSettings.profiles[i].subscription;
          mergedProfiles[k].boundary = localSettings.profiles[i].boundary;
          mergedProfiles[k].function = localSettings.profiles[i].function;
        }
      }
    });
    const i = indexOfProfile(localSettings, localSettings.currentProfile);
    settings = {
      profiles: mergedProfiles,
      currentProfile:
        i >= 0 ? localSettings.currentProfile : config.defaultProfile || (mergedProfiles[0] && mergedProfiles[0].id),
      ui: localSettings.ui,
    };
  } else {
    settings = {
      profiles: mergedProfiles,
      currentProfile: config.defaultProfile || (mergedProfiles[0] && mergedProfiles[0].id),
      ui: defaultFusebitUISettings,
    };
  }

  // If a new user is joining, ensure the current profile is set to the one from the init token

  if (isJoinStepOne) {
    const initToken = decodeJwt(window.location.hash.substring(1));
    if (!initToken || !initToken.profile) {
      throw new FusebitError('Invalid invitation link', {
        details: `The invitation link you are using is invalid. Ask your administrator to generate a new invitation link.`,
      });
    }
    let matchingProfile = indexOfProfile(settings, initToken.profile.id);
    if (matchingProfile >= 0) {
      settings.currentProfile = initToken.profile.id;
      setLocalSettings(settings);
    }
  }

  // Determine selected profile based on accountId from URL path or selected profile from local settings

  let selectedProfile: IFusebitProfile | undefined;
  if (settings) {
    const currentProfile = settings.currentProfile;
    if (accountId) {
      selectedProfile = settings.profiles.reduce((selected: IFusebitProfile | undefined, current: IFusebitProfile) => {
        if (current.account === accountId && current.id === currentProfile) {
          // Profile that matches both accountId and locally selected profile id wins
          return current;
        } else if (!selected && current.account === accountId) {
          // Othweise, profile that matches just accountId wins
          return current;
        } else {
          return selected;
        }
      }, undefined);
    } else {
      selectedProfile = settings.profiles.reduce((selected: IFusebitProfile | undefined, current: IFusebitProfile) => {
        if (current.id === currentProfile) {
          return current;
        } else {
          return selected;
        }
      }, undefined);
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

  if (profile && profile.auth && profile.auth.expires_at - Date.now() < 30 * 60 * 1000) {
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
        auth,
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
              error: new FusebitError('Error joining the portal', {
                details: [`Unable to join the portal:`, error.message].join(' '),
              }),
            };
          }
        }
        if (!me) {
          try {
            me = { accountId: profile.account, ...(await getMe(profile)) };
          } catch (error) {
            me = {
              accountId: profile.account,
              error: new FusebitError('Error accessing the Fusebit service', {
                details: [
                  `Unable to access the Fusebit service '${profile.displayName || profile.id}' at '${
                    profile.baseUrl
                  }' to obtain information about your permissions:`,
                  error.message,
                ].join(' '),
              }),
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

  if (auth && auth.error) {
    throw new FusebitError('Authorization error', {
      details: `You are not authorized to access the Fusebit Portal. Error '${auth.error || 'N/A'}'. Error details: '${
        auth.error_description
      }'.`,
    });
  }

  if (profile && !profile.auth) {
    // no access token or access token expires in less than 30 mins, re-authenticate
    login(profile, isJoinStepOne ? `/joining${window.location.hash}` : window.location.pathname);
    return <></>;
  }

  if (profile && !profile.me) {
    return null;
  }

  if (profile) {
    if (profile.me && profile.me.error) {
      throw profile.me.error;
    }

    const saveProfileImpl = (profile: IFusebitProfile) => {
      if (settings) {
        settings.profiles[indexOfProfile(settings, profile.id)] = {
          ...profile,
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

    return <ProfileContext.Provider value={{ logout, profile, settings, saveProfile }} {...props} />;
  } else {
    throw new Error('User is not logged');
  }
}

const useProfile = () => {
  const result = React.useContext(ProfileContext);
  if (!result) {
    throw new Error(`The 'useProfile' must be called within the context of a ProfileProvider.`);
  }
  return result as ProfileProps;
};

function login(profile: IFusebitProfile, bookmark: string) {
  let url = parseUrl(profile.oauth.webAuthorizationUrl, true);
  let state = Math.floor(Math.random() * 999999).toString(32);
  //@ts-ignore
  url.query = {
    ...url.query,
    response_type: 'token',
    client_id: profile.oauth.webClientId,
    redirect_uri: `${window.location.protocol}//${window.location.host}`,
    audience: profile.baseUrl,
    state,
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
  let hash: any = window.location.hash[0] === '#' ? parse(window.location.hash.substring(1)) : {};
  if (hash.expires_in) {
    hash.expires_at = Date.now() + +hash.expires_in * 1000;
    delete hash.expires_in;
  }
  if (hash.access_token) {
    window.localStorage.removeItem(FusebitAuthStateKey);
    if (expectedState !== hash.state) {
      hash = {
        error: 'State parameter mismatch',
        error_description: 'Integrity of the login transaction cannot be validated. Try again.',
      };
    }
  }
  return hash.error || hash.access_token ? hash : undefined;
}

function parse(queryString: string) {
  let tokens = queryString.split('&');
  let result: any = {};
  tokens.forEach(t => {
    let [k, v] = t.split('=');
    result[k] = decodeURIComponent(v);
  });
  return result;
}

export { ProfileProvider, useProfile, useProfileMaybe };
