import React from 'react';
import { FusebitLogo, FusebitLogoProps } from '@5qtrs/fusebit-logo';
import { FusebitLink, FusebitLinkProps } from '@5qtrs/fusebit-link';

// --------------
// Exported Types
// --------------

export type FusebitLogoLinkProps = {} & FusebitLinkProps & FusebitLogoProps;

// -------------------
// Exported Components
// -------------------

export function FusebitLogoLink({
  to,
  href,
  openTab,
  gaCategory,
  gaAction,
  gaLabel,
  hover,
  visited,
  noHover,
  noVisit,
  onClick,
  ...rest
}: FusebitLogoLinkProps) {
  return (
    <FusebitLink
      to={to || href ? to : '/'}
      href={href}
      openTab={openTab}
      gaCategory={gaCategory}
      gaAction={gaAction}
      gaLabel={gaLabel}
      noHover
      noVisit
    >
      <FusebitLogo {...rest} />
    </FusebitLink>
  );
}
