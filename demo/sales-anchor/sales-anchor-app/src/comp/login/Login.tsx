import React from 'react';
import styled from 'styled-components';
import { Logo } from '../Logo';
import { GoogleLoginButton } from './GoogleLoginButton';
import { Auth0LoginButton } from './Auth0LoginButton';

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const Center = styled.div`
  display: flex;
  flex-direction: column;
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
`;

export type LoginProps = {
  onLogin: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

export function Login({ onLogin }: LoginProps) {
  return (
    <Container>
      <Center>
        <Logo />
        <Buttons>
          <Auth0LoginButton onLogin={onLogin} />
          <GoogleLoginButton onLogin={onLogin} />
        </Buttons>
      </Center>
    </Container>
  );
}
