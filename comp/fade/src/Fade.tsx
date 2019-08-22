import React, { useLayoutEffect, useState } from 'react';
import { Box, BoxProps } from '@5qtrs/box'

// ------------------
// Internal Constants
// ------------------

const maxOpacity = 100;
const minOpacity = 0;

// ------------------
// Internal Functions
// ------------------

function updateOpacity(opacity: number, increment: boolean, rate: number) {
  opacity += increment ? rate : -rate;
  if (opacity > maxOpacity) {
    opacity = maxOpacity;
  }
  if (opacity < minOpacity) {
    opacity = minOpacity;
  }
  return opacity;
}

// --------------
// Exported Types
// --------------

export type FadeProps = {
  fadeOut?: boolean;
  fadeIn?: boolean;
  fadeRate?: number;
  show?: boolean;
  onFadeChange?: (fadeIn: boolean) => void;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function Fade({ show, fadeOut, fadeIn, fadeRate, onFadeChange, style, children, ...rest }: FadeProps) {
  const [visibleLast, setVisibleLast] = useState(false);
  const [opacity, setOpacity] = useState(minOpacity);

  fadeRate = fadeRate || 3;
  if (show !== visibleLast) {
    if (show && !fadeIn) {
      setOpacity(maxOpacity);
    }
    if (!show && !fadeOut) {
      setOpacity(minOpacity);
    }
    setVisibleLast(show || false);
  }

  useLayoutEffect(() => {
    if (opacity >= minOpacity && opacity <= maxOpacity) {
      window.requestAnimationFrame(() => {
        const newOpacity = updateOpacity(opacity, show || false, fadeRate as number);
        if (opacity !== newOpacity) {
          if (newOpacity === maxOpacity && onFadeChange) {
            onFadeChange(true);
          } else if (newOpacity === minOpacity && onFadeChange) {
            onFadeChange(false);
          }
          setOpacity(newOpacity);
        }
      });
    }
  }, [opacity, show]);

  style = style || {};
  style.opacity = opacity / 100;

  return <Box {...rest} style={style}>{children}</Box>
}
