import { CorpLogoDynamic } from '@5qtrs/corp-logo-dynamic';
import { Fade } from '@5qtrs/fade';
import { Modal as ModalBase } from '@5qtrs/modal';
import React, { useContext, useEffect, useState } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { getTheme } from '../util';

// -------------------
// Internal Components
// -------------------

const FullScreenFade = styled(Fade)`
  height: 100%;
  width: 100%;
  position: fixed;
  z-index: 1000;
`;

const Modal = styled(ModalBase)`
  background-color: white;
`;

// --------------
// Exported Types
// --------------

export type AppLoadingProps = {
  visible?: boolean;
  logoDisplayDelay?: number;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function AppLoading({ visible, logoDisplayDelay }: AppLoadingProps) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [logoFadedOut, setLogoFadedOut] = useState(false);
  const [fullFadeOut, setFullFadeOut] = useState(false);
  const startTime = useState(Date.now())[0];

  logoDisplayDelay = logoDisplayDelay || 500;

  function executeAfter(func: () => void, delay: number): NodeJS.Timer | undefined {
    const endTime = Date.now();
    const delta = endTime - startTime;
    const remaining = delay - delta;
    if (remaining > 0) {
      return setTimeout(func, remaining);
    }
    func();
  }

  function fullfadeOut() {
    setImmediate(() => setFullFadeOut(true));
  }
  function logoFadeOut() {
    setLogoFadedOut(true);
  }

  useEffect(() => {
    let timer: NodeJS.Timer | undefined;
    if (visible) {
      const delay = logoDisplayDelay as number;
      timer = executeAfter(() => setLogoVisible(true), delay);
    } else {
      if (logoVisible) {
        const delay = (logoDisplayDelay as number) * 4;
        timer = executeAfter(() => setLogoVisible(false), delay);
      } else {
        setLogoFadedOut(true);
      }
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [visible]);

  const context = useContext(ThemeContext);
  const theme = getTheme(context, 'loading', 'logo');
  const color = theme.color || 'black';
  const size = theme.size || 80;
  const rate = theme.rate || 5;
  const strokeWidth = theme.strokeWidth || 3;

  return fullFadeOut ? null : (
    <FullScreenFade visible={!logoFadedOut} fadeOut={true} onFadeOut={fullfadeOut}>
      <Modal visible={true}>
        <Fade visible={logoVisible} fadeIn={true} fadeOut={true} onFadeOut={logoFadeOut}>
          <CorpLogoDynamic visible={!logoFadedOut} color={color} size={size} rate={rate} strokeWidth={strokeWidth} />
        </Fade>
      </Modal>
    </FullScreenFade>
  );
}
