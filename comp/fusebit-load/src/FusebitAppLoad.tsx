import React, { useState, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { Fade, FadeProps } from '@5qtrs/fade';
import { Modal } from '@5qtrs/modal';
import { FusebitSpinner } from '@5qtrs/fusebit-spin';
import { FusebitColor } from '@5qtrs/fusebit-color';

// -------------------
// Internal Components
// -------------------

const FullScreenFade = styled(Fade)`
  height: 100%;
  width: 100%;
  position: fixed;
  z-index: 1000;
`;

// --------------
// Exported Types
// --------------

export type FusebitAppLoadProps = {
  show?: boolean;
} & FadeProps;

// -------------------
// Exported Components
// -------------------

export function FusebitAppLoad({ color, background, show, ...rest }: FusebitAppLoadProps) {
  const [spinnerShow, setSpinnerShow] = useState(false);
  const [spinnerFadedOut, setSpinnerFadedOut] = useState(false);
  const [fullFadeOut, setFullFadeOut] = useState(false);
  const startTime = useState(Date.now())[0];

  const spinShowDelay = 500;

  function executeAfter(func: () => void, delay: number): NodeJS.Timer | undefined {
    const endTime = Date.now();
    const delta = endTime - startTime;
    const remaining = delay - delta;
    if (remaining > 0) {
      return setTimeout(func, remaining);
    }
    func();
  }

  function onFullFadeOut(fadeIn: boolean) {
    if (!fadeIn) {
      setImmediate(() => setFullFadeOut(true));
    }
  }
  function onSpinnerFadeOut(fadeIn: boolean) {
    if (!fadeIn) {
      setSpinnerFadedOut(true);
    }
  }

  useLayoutEffect(() => {
    let timer: NodeJS.Timer | undefined;
    if (show) {
      const delay = spinShowDelay as number;
      timer = executeAfter(() => setSpinnerShow(true), delay);
    } else {
      if (spinnerShow) {
        const delay = (spinShowDelay as number) * 4;
        timer = executeAfter(() => setSpinnerShow(false), delay);
      } else {
        setSpinnerFadedOut(true);
      }
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [show]);

  return fullFadeOut ? null : (
    <FullScreenFade
      show={!spinnerFadedOut}
      background={background || FusebitColor.white}
      fadeOut
      onFadeChange={onFullFadeOut}
      {...rest}
    >
      <Modal show>
        <Fade show={spinnerShow} fadeIn fadeOut onFadeChange={onSpinnerFadeOut}>
          <FusebitSpinner stop={!spinnerShow} color={color} background={background} />
        </Fade>
      </Modal>
    </FullScreenFade>
  );
}
