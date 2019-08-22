import React from 'react';
import { BoxProps } from '@5qtrs/box';
import { FusebitLinkCard, FusebitLinkCardType } from '@5qtrs/fusebit-link-card';
import { FusebitPostMeta } from './FusebitPostMeta';
import { FusebitPostUrl } from './FusebitPostUrl';

// --------------
// Exported Types
// --------------

export enum FusebitPostCardType {
  large = 'large',
  medium = 'medium',
  small = 'small',
}

export type FusebitPostCardProps = {
  type?: FusebitPostCardType;
} & FusebitPostMeta &
  BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitPostCard({ type, ...rest }: FusebitPostCardProps) {
  const postUrl = FusebitPostUrl.createFromMeta(rest);

  return <FusebitLinkCard to={postUrl.relativeUrl()} type={(type as string) as FusebitLinkCardType} {...rest} />;
}
