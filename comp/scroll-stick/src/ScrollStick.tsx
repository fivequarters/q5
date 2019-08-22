import { asPassive } from '@5qtrs/passive';
import React, { useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

let nextStickyCount = 0;

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

const Container = styled.div<ScrollStickProps>`
  width: 100%;
  &.sticky {
    position: ${props => (props.useWindowScroll ? 'fixed' : 'sticky')};
    top: 0;
  }
`;

// --------------
// Exported Types
// --------------

export type ScrollStickProps = {
  sticky?: boolean;
  useWindowScroll?: boolean;
  onStickyChange?: (isSticky: boolean) => void;
  children?: any;
};

// -------------------
// Exported Components
// -------------------

export function ScrollStick({ sticky, children, onStickyChange, useWindowScroll }: ScrollStickProps) {
  const [stickyState, setStickyState] = useState<IStickyState>({
    offset: -1,
    height: -1,
    width: -1,
    enabled: false,
    parent: window,
  });
  const [stickyCount, setStickyCount] = useState(0);
  if (stickyCount === 0) {
    nextStickyCount++;
    setStickyCount(nextStickyCount);
  }

  function onElement(element: HTMLDivElement): void {
    if (element && stickyState.offset === -1) {
      if (element.parentElement) {
        setStickyState({
          enabled: stickyState.enabled,
          offset: element.parentElement ? element.offsetTop - element.parentElement.offsetTop : element.offsetTop,
          height: element.offsetHeight,
          width: element.offsetWidth,
          parent: useWindowScroll ? window : element.parentElement || window,
        });
        checkIfSticky();
      }
    }
  }

  const checkIfSticky = () => {
    if (stickyState.offset !== -1) {
      let scroll = getScrollOffset(stickyState.parent);
      if (stickyState.enabled !== scroll > stickyState.offset) {
        stickyState.enabled = !stickyState.enabled;
        setStickyState({
          enabled: stickyState.enabled,
          offset: stickyState.offset,
          height: stickyState.height,
          width: stickyState.width,
          parent: stickyState.parent,
        });
        if (onStickyChange) {
          onStickyChange(stickyState.enabled);
        }
      }
    }
  };

  useLayoutEffect(() => {
    if (stickyState.parent) {
      stickyState.parent.addEventListener('scroll', checkIfSticky, asPassive());
      return () => stickyState.parent.removeEventListener('scroll', checkIfSticky, asPassive());
    }
  }, [stickyState]);

  return (
    <>
      <Container
        style={{ zIndex: nextStickyCount - stickyCount + 1 }}
        useWindowScroll={useWindowScroll}
        className={sticky || stickyState.enabled ? 'sticky' : ''}
        ref={onElement}
      >
        {children}
      </Container>
      <div style={{ height: sticky || stickyState.enabled ? stickyState.height : 0 }} />
    </>
  );
}
