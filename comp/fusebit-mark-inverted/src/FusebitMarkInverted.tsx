import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

// --------------
// Exported Types
// --------------

export type FusebitMarkInvertedProps = {
  size?: number;
  color?: FusebitColor;
  background?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitMarkInverted({ size, color, expand, style, ...rest }: FusebitMarkInvertedProps) {
  size = !expand && !size ? 50 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg
        width={size || '100%'}
        height={size || '100%'}
        viewBox="42 642 130 130"
        fillRule="evenodd"
        clipRule="evenodd"
        strokeLinejoin="round"
        strokeMiterlimit="1.41421"
      >
        <mask id="logoMask">
          <rect x="42" y="642" width="600" height="600" fill="white" />
          <g transform="matrix(0.707107,-0.707107,0.707107,0.707107,0,707.107)">
            <path
              d="M35.4162 107.386C35.4162 103.408 38.636 100.188 42.6138 100.188C46.5917 100.188 49.8115 103.408 49.8115 107.386C49.8115 111.364 46.5917 114.584 42.6138 114.584C38.636 114.584 35.4162 111.364 35.4162 107.386ZM107.386 114.584H64.2003C60.2225 114.584 57.0027 111.364 57.0026 107.386C57.0027 103.408 60.2225 100.188 64.2003 100.188H107.386C111.364 100.188 114.584 103.408 114.584 107.386C114.584 111.364 111.364 114.584 107.386 114.584ZM107.386 92.9973L42.6138 92.9973C38.636 92.9973 35.4162 89.7775 35.4162 85.7996C35.4162 81.8218 38.636 78.602 42.6138 78.602L107.386 78.602C111.364 78.602 114.584 81.8218 114.584 85.7997C114.584 89.7775 111.364 92.9973 107.386 92.9973ZM42.6138 35.4162L85.7997 35.4161C89.7775 35.4161 92.9973 38.636 92.9973 42.6138C92.9973 46.5916 89.7775 49.8114 85.7997 49.8114L42.6138 49.8114C38.636 49.8114 35.4162 46.5916 35.4162 42.6138C35.4162 38.636 38.636 35.4162 42.6138 35.4162ZM107.386 71.3979L42.6138 71.3979C38.636 71.3979 35.4162 68.1781 35.4162 64.2002C35.4162 60.2224 38.636 57.0026 42.6138 57.0026L107.386 57.0026C111.364 57.0026 114.584 60.2224 114.584 64.2002C114.584 68.1781 111.357 71.4044 107.386 71.3979ZM107.386 49.8114C103.408 49.8114 100.189 46.5916 100.189 42.6138C100.189 38.636 103.408 35.4162 107.386 35.4162C111.364 35.4162 114.584 38.636 114.584 42.6138C114.584 46.5916 111.364 49.8114 107.386 49.8114Z"
              fill="black"
            />
          </g>
        </mask>
        <rect x="42" y="642" width="600" height="600" fill={color || FusebitColor.red} mask="url(#logoMask)" />
      </svg>
    </Box>
  );
}
