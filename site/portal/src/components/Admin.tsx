import React from "react";
import { getLocalSettings } from "../lib/Settings";
import { useProfile } from "./ProfileProvider";

function Admin({ ...rest }) {
  const profile = useProfile();
  return (
    <div>
      <p>You are now logged in.</p>
      <p>Profile is:</p>
      <pre>{JSON.stringify(profile, null, 2)}</pre>
      <p>Settings are:</p>
      <pre>{JSON.stringify(getLocalSettings(), null, 2)}</pre>
    </div>
  );
}

export default Admin;
