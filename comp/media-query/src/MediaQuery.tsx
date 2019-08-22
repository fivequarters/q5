import React from 'react';
import Responsive from 'react-responsive';

// --------------
// Exported Types
// --------------

export enum MediaType {
  mobile = 1,
  smallTablet = 2,
  largeTablet = 4,
  desktop = 8,
  allExceptMobile = 14,
}

export type MediaQueryProps = {
  mediaType: MediaType;
  children: any;
};

// -------------------
// Exported Components
// -------------------

export function MediaQuery({ mediaType, ...props }: MediaQueryProps) {
  let maxWidth = undefined;
  let minWidth = undefined;

  if (mediaType === MediaType.mobile) {
    maxWidth = 480;
  } else {
    minWidth = 481;
  }

  return <Responsive {...props} minWidth={minWidth} maxWidth={maxWidth} />;
}
