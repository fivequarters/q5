import React, { useContext } from 'react';
import { ApiContext } from '../ApiContext';
import { Button } from '../Button';

// --------------
// Exported Types
// --------------

export type Auht0LoginButtonProps = {
  onLogin: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Auth0LoginButton({ onLogin }: Auht0LoginButtonProps) {
  const api = useContext(ApiContext);

  async function checkForCallback() {
    if (window.location.href.includes('#access_token=')) {
      await api.authAuth0.endLogin();
      window.history.pushState('', '', '/');
      onLogin();
    }
  }

  function onClick() {
    api.authAuth0.startLogin();
  }

  checkForCallback();

  return <Button onClick={onClick}>Sign In - Auth0</Button>;
}
