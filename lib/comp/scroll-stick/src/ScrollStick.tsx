import { asPassive } from '@5qtrs/passive';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

// -------------------
// Internal Interfaces
// -------------------

interface IStickyState {
  offset: number;
  height: number;
  enabled: boolean;
  parent: Window | HTMLElement;
}

// ------------------
// Internal Functions
// ------------------

function getScrollOffset(elementOrWindow: HTMLElement | Window) {
  const asElement = elementOrWindow as HTMLElement;
  if (asElement.scrollTop !== undefined) {
    return asElement.scrollTop;
  }

  const asWindow = elementOrWindow as Window;
  return asWindow.pageYOffset;
}

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  &.sticky {
    position: fixed;
    top: 0;
  }
`;

// --------------
// Exported Types
// --------------

export type ScrollStickProps = {
  className?: string;
  useWindowScroll?: boolean;
  onStickyChange?: (isSticky: boolean) => void;
  children?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function ScrollStick({ children, onStickyChange, useWindowScroll, className, ...rest }: ScrollStickProps) {
  useWindowScroll = useWindowScroll || false;
  const [sticky, setStickyState] = useState<IStickyState>({ offset: -1, height: -1, enabled: false, parent: window });

  function onNavBarElement(element: HTMLDivElement): void {
    if (element && sticky.offset === -1) {
      setStickyState({
        enabled: sticky.enabled,
        offset: element.offsetTop,
        height: element.offsetHeight,
        parent: useWindowScroll ? window : element.parentElement || window,
      });
      checkIfSticky();
    }
  }

  const checkIfSticky = () => {
    if (sticky.offset !== -1) {
      const scroll = getScrollOffset(sticky.parent);
      if (sticky.enabled !== scroll > sticky.offset) {
        sticky.enabled = !sticky.enabled;
        setStickyState(sticky);
        if (onStickyChange) {
          onStickyChange(sticky.enabled);
        }
      }
    }
  };

  useEffect(() => {
    if (sticky.parent) {
      sticky.parent.addEventListener('scroll', checkIfSticky, asPassive());
      return () => sticky.parent.removeEventListener('scroll', checkIfSticky, asPassive());
    }
  }, [sticky]);

  const adjustedClassName = `${className || ''}${sticky.enabled ? ' sticky' : ''}`;

  return (
    <>
      <Container {...rest} className={adjustedClassName} ref={onNavBarElement}>
        {children}
      </Container>
      <div style={{ height: sticky.enabled ? sticky.height : 0 }} />
    </>
  );
}
