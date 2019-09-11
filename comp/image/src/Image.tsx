import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';

export type ImageProps = {
  src: string;
  alt?: string;
} & BoxProps;

export function Image({ src, alt, width, height, borderRadius, ...rest }: ImageProps) {
  return (
    <Box width={width || '100%'} height={height} {...rest}>
      <img
        width={width || '100%'}
        height={height}
        src={src[0] === '/' || src.indexOf('http') === 0 ? src : `/${src}`}
        style={{ borderRadius, objectFit: 'cover' }}
        alt={alt || ''}
      />
    </Box>
  );
}
