import React, { useContext } from 'react';
import { ApiContext } from '../ApiContext';
import { Button } from '../Button';
import { GoogleLogin } from 'react-google-login';

// --------------
// Exported Types
// --------------

export type GoogleLoginButtonProps = {
  onLogin: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function GoogleLoginButton({ onLogin }: GoogleLoginButtonProps) {
  const api = useContext(ApiContext);

  function onClick(props: any) {
    return props && props.onClick ? props.onClick : () => {};
  }

  const responseGoogle = async (response: any) => {
    await api.authGoogle.login(response.profileObj, response.tokenId);
    onLogin();
  };

  return (
    <GoogleLogin
      clientId={api.authGoogle.clientId}
      render={props => <Button onClick={onClick(props)}>Sign In - Google</Button>}
      onSuccess={responseGoogle}
      onFailure={responseGoogle}
    />
  );
}
