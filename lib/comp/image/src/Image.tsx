import React from 'react';

export type ImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function Image({ ...props }: ImageProps) {
  return <img {...props} />;
}
