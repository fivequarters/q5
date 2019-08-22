import React, { useLayoutEffect } from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';

// ------------------
// Internal Functions
// ------------------

function preventDefault(event: any) {
  event.preventDefault();
  event.stopPropagation();
}

// -------------------
// Internal Components
// -------------------

const StyledBox = styled(Box)`
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 999;
`;

// --------------
// Exported Types
// --------------

export type ModalProps = {
  show?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function Modal({ height, width, center, middle, children, show, style, ...rest }: ModalProps) {
  useLayoutEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      document.body.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.body.style.overflow = 'visible';
        document.body.removeEventListener('touchmove', preventDefault, false);
      };
    }
  }, [show]);

  return show ? (
    <StyledBox
      height={height || '100%'}
      width={width || '100%'}
      center={center === false ? false : true}
      middle={middle === false ? false : true}
      {...rest}
    >
      {children}
    </StyledBox>
  ) : null;
}
