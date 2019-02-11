import { clone } from '@5qtrs/clone';
import { asPassive } from '@5qtrs/passive';
import React, { useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

// -------------------
// Internal Interfaces
// -------------------

interface IStickyState {
  offset: number;
  height: number;
  width: number;
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

export function ScrollStick({
  children,
  onStickyChange,
  useWindowScroll,
  className,
  style,
  ...rest
}: ScrollStickProps) {
  useWindowScroll = useWindowScroll || true;
  const [sticky, setStickyState] = useState<IStickyState>({
    offset: -1,
    height: -1,
    width: -1,
    enabled: false,
    parent: window,
  });

  function onNavBarElement(element: HTMLDivElement): void {
    if (element && sticky.offset === -1) {
      setStickyState({
        enabled: sticky.enabled,
        offset: element.offsetTop,
        height: element.offsetHeight,
        width: element.offsetWidth,
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

  useLayoutEffect(() => {
    if (sticky.parent) {
      sticky.parent.addEventListener('scroll', checkIfSticky, asPassive());
      return () => sticky.parent.removeEventListener('scroll', checkIfSticky, asPassive());
    }
  }, [sticky]);

  const adjustedClassName = `${className || ''}${sticky.enabled ? ' sticky' : ''}`;

  const styleWithWidth = style !== undefined ? clone(style) : {};
  if (sticky.width !== -1) {
    styleWithWidth.width = styleWithWidth.width || sticky.width;
  }

  return (
    <>
      <Container {...rest} style={styleWithWidth} className={adjustedClassName} ref={onNavBarElement}>
        {children}
      </Container>
      <div style={{ height: sticky.enabled ? sticky.height : 0 }} />
    </>
  );
}
