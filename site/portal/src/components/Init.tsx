import React, { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";
import {
  getExternalSettingsUrl,
  getExternalSettings,
  setLocalSettings
} from "../lib/Settings";

function Init() {
  const [loaded, setLoaded] = useState(false);
  const [exception, setException] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!loaded && !exception) {
      (async () => {
        try {
          let settingsUrl = getExternalSettingsUrl();
          let settings = await getExternalSettings(settingsUrl);
          if (!cancelled) {
            setLocalSettings(settings);
            setLoaded(true);
          }
        } catch (e) {
          if (!cancelled) setException(e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [loaded, exception]);

  if (exception) {
    throw exception;
  }

  if (loaded) {
    return <Redirect to="/" />;
  } else {
    return <div>Initializing...</div>;
  }
}

export default Init;
