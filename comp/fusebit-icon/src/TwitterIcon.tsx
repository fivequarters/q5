import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type TwitterIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function TwitterIcon({ size, color, expand, ...rest }: TwitterIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 24 20" fill="none">
        <path
          d="M24 2.39613C23.098 2.79671 22.1441 3.06152 21.168 3.18232C22.1978 2.55254 22.9695 1.56178 23.34 0.393828C22.3723 0.983542 21.3129 1.39903 20.208 1.62224C19.4695 0.802363 18.486 0.25661 17.4118 0.0705742C16.3376 -0.115462 15.2335 0.0687402 14.2725 0.594292C13.3116 1.11984 12.5483 1.95702 12.1023 2.97451C11.6563 3.99201 11.5528 5.13228 11.808 6.21649C9.85131 6.11517 7.93733 5.59363 6.19039 4.68572C4.44344 3.77781 2.90262 2.50386 1.668 0.946612C1.23497 1.72072 1.00742 2.59738 1.008 3.48942C1.00646 4.31784 1.20506 5.13379 1.58611 5.86463C1.96715 6.59546 2.51882 7.21851 3.192 7.67829C2.40957 7.6565 1.64386 7.44158 0.96 7.0518V7.11322C0.965864 8.27394 1.36319 9.39695 2.08478 10.2923C2.80636 11.1877 3.80791 11.8004 4.92 12.0269C4.49191 12.1602 4.04745 12.2305 3.6 12.2357C3.29027 12.232 2.98131 12.2032 2.676 12.1497C2.99269 13.1482 3.60555 14.0207 4.42929 14.646C5.25303 15.2713 6.24669 15.6182 7.272 15.6384C5.54064 17.033 3.40306 17.7941 1.2 17.8004C0.798882 17.8017 0.398083 17.7771 0 17.7267C2.24931 19.2134 4.87058 20.0026 7.548 19.9992C9.39563 20.0189 11.2286 19.6614 12.9397 18.9478C14.6509 18.2342 16.206 17.1787 17.5142 15.8429C18.8225 14.5072 19.8576 12.9179 20.5591 11.1681C21.2606 9.41824 21.6144 7.54283 21.6 5.65142C21.6 5.44259 21.6 5.22147 21.6 5.00036C22.5416 4.28151 23.3538 3.40027 24 2.39613Z"
          fill={color || FusebitColor.black}
        />
      </svg>
    </Box>
  );
}
