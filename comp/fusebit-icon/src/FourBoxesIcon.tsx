import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type FourBoxesIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FourBoxesIcon({ size, color, expand, ...rest }: FourBoxesIconProps) {
  size = !expand && !size ? 26 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg
        width={size || '100%'}
        height={size || '100%'}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.16669 22.5V15H9.66669V22.5H2.16669ZM15 9.66663V2.16663H22.5V9.66663H15ZM15 22.5V15H22.5V22.5H15ZM2.16669 2.16663H9.66669V9.66663H2.16669V2.16663Z"
          stroke={color || FusebitColor.dark}
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
    </Box>
  );
}
