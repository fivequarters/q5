import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type CloseNavIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function CloseNavIcon({ size, color, expand, ...rest }: CloseNavIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 100 100">
        <line
          x1="20"
          y1="20"
          x2="80"
          y2="80"
          stroke={color || FusebitColor.black}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <line
          x1="80"
          y1="20"
          x2="20"
          y2="80"
          stroke={color || FusebitColor.black}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}
