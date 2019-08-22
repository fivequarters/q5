import React, { useState, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';

// -------------------
// Internal Components
// -------------------

const StyledBox = styled(Box)`
  overflow: hidden;
`;

// --------------
// Exported Types
// --------------

export type DrawerProps = {
  open?: boolean;
  vertical?: boolean;
  rate?: number;
  onOpenChange?: (isOpen: boolean) => void;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function Drawer({ open, vertical, width, height, rate, onOpenChange, children, ...rest }: DrawerProps) {
  const [size, setSize] = useState((open ? (vertical ? height : width) : 0) as number);
  const definedRate = rate || 8;

  useLayoutEffect(() => {
    const endpoint = (vertical ? height : width) as number;
    let newSize = -1;
    let delta = definedRate * 0.01 * size;
    delta = delta > definedRate ? delta : definedRate;
    if (open && size < endpoint) {
      newSize = size + delta;
      newSize = newSize < endpoint ? newSize : endpoint;
    } else if (!open && size > 0) {
      newSize = size - delta;
      newSize = newSize > 0 ? newSize : 0;
    }

    let animationFrame: number;
    if (newSize >= 0) {
      animationFrame = window.requestAnimationFrame(() => setSize(newSize));
    } else {
      if (onOpenChange) {
        onOpenChange(!!open);
      }
    }
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  });

  return (
    <StyledBox style={{ width: vertical ? width : size, height: vertical ? size : height }} {...rest}>
      {children}
    </StyledBox>
  );
}
