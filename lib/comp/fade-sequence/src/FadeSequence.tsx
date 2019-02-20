import { Fade } from '@5qtrs/fade';
import React, { useState, useLayoutEffect } from 'react';

// --------------
// Exported Types
// --------------

export type FadeSequenceProps = {
  children?: any;
  duration?: number;
  fadeRate?: number;
  repeat?: boolean;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function FadeSequence({ children, duration, fadeRate, repeat, ...rest }: FadeSequenceProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  function onNext() {
    if (visible) {
      if (repeat || current < children.length - 1) {
        setTimeout(() => {
          setVisible(false);
        }, duration);
      }
    } else {
      setCurrent((current + 1) % children.length);
      setVisible(true);
    }
  }

  const currentChild = children[current];

  return (
    <Fade {...rest} visible={visible} fadeIn fadeOut fadeRate={fadeRate} onFadeOut={onNext} onFadeIn={onNext}>
      {currentChild}
    </Fade>
  );
}
