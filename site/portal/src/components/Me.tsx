import React from 'react';
import { useProfile } from './ProfileProvider';
import Button from '@material-ui/core/Button';

function Me({ ...rest }) {
  const { profile, logout, settings } = useProfile();
  return (
    <div>
      <p>You are now logged in.</p>
      <Button onClick={() => logout()} color="primary" variant="contained">
        Logout
      </Button>
      <p>Current profile is:</p>
      <pre>{JSON.stringify(profile, null, 2)}</pre>
      <p>Settings are:</p>
      <pre>{JSON.stringify(settings, null, 2)}</pre>
    </div>
  );
}

export default Me;
