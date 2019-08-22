import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type OpenNavIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function OpenNavIcon({ size, color, expand, ...rest }: OpenNavIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 100 100">
        <line
          x1="10"
          y1="20"
          x2="90"
          y2="20"
          stroke={color || FusebitColor.dark}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <line
          x1="10"
          y1="50"
          x2="90"
          y2="50"
          stroke={color || FusebitColor.dark}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <line
          x1="10"
          y1="80"
          x2="90"
          y2="80"
          stroke={color || FusebitColor.dark}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}
