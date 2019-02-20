import React, { useEffect, useState } from 'react';

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
  children?: any;
  fadeOut?: boolean;
  fadeIn?: boolean;
  fadeRate?: number;
  visible?: boolean;
  onFadeOut?: () => void;
  onFadeIn?: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Fade({ visible, fadeOut, fadeIn, fadeRate, onFadeIn, onFadeOut, style, children, ...rest }: FadeProps) {
  const [visibleLast, setVisibleLast] = useState(false);
  const [opacity, setOpacity] = useState(minOpacity);

  fadeRate = fadeRate || 3;
  if (visible !== visibleLast) {
    if (visible && !fadeIn) {
      setOpacity(maxOpacity);
    }
    if (!visible && !fadeOut) {
      setOpacity(minOpacity);
    }
    setVisibleLast(visible || false);
  }

  useEffect(() => {
    let timer: NodeJS.Timer;
    if (opacity >= minOpacity && opacity <= maxOpacity) {
      timer = setTimeout(() => {
        const newOpacity = updateOpacity(opacity, visible || false, fadeRate as number);
        if (opacity !== newOpacity) {
          if (newOpacity === maxOpacity && onFadeIn) {
            onFadeIn();
          } else if (newOpacity === minOpacity && onFadeOut) {
            onFadeOut();
          }
          setOpacity(newOpacity);
        }
      }, 10);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [opacity, visible]);

  style = style || {};
  style.opacity = opacity / 100;
  return (
    <div {...rest} style={style}>
      {children}
    </div>
  );
}
