import React from 'react';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitNavLink, FusebitLogoLink, FusebitNavLinkType } from '@5qtrs/fusebit-nav-link';
import { FusebitSocialButton, FusebitSocialType } from '@5qtrs/fusebit-social';

// -------------------
// Internal Components
// -------------------

function MobileVersion({ ...rest }: FusebitFooterProps) {
  return (
    <Box center width="100%" background={FusebitColor.black} {...rest}>
      <Box vertical width="100%" padding={10}>
        <Box middle expand width="100%" gap={10}>
          <FusebitLogoLink markColor={FusebitColor.white} />
          <Box expand />
          <FusebitSocialButton noOutline type={FusebitSocialType.linkedIn} small />
          <FusebitSocialButton marginLeft={10} noOutline type={FusebitSocialType.twitter} small />
        </Box>
        <Box middle expand width="100%" gap={10}>
          <Box width="100%">
            <FusebitNavLink linkType={FusebitNavLinkType.copyRight} />
          </Box>
          <FusebitNavLink linkType={FusebitNavLinkType.privacy} />
          <FusebitNavLink linkType={FusebitNavLinkType.terms} />
        </Box>
      </Box>
    </Box>
  );
}

function NonMobileVersion({ maxWidth, ...rest }: FusebitFooterProps) {
  return (
    <Box center width="100%" background={FusebitColor.black} {...rest}>
      <Box padding={20} width="100%" maxWidth={maxWidth || 1200}>
        <Box middle width="100%">
          <FusebitLogoLink markColor={FusebitColor.white} />
          <Box expand />
          <FusebitNavLink marginLeft={30} noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.about} />
          <FusebitNavLink marginLeft={30} noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.blog} />
          <FusebitNavLink marginLeft={30} noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.docs} />
        </Box>
        <Box middle width="100%">
          <Box middle height={60}>
            <FusebitNavLink linkType={FusebitNavLinkType.copyRight} />
          </Box>
          <Box right middle expand minWidth={400} height={60} noWrap>
            <FusebitNavLink marginLeft={30} linkType={FusebitNavLinkType.privacy} />
            <FusebitNavLink marginLeft={30} linkType={FusebitNavLinkType.terms} />
            <FusebitSocialButton marginLeft={30} noOutline type={FusebitSocialType.linkedIn} small />
            <FusebitSocialButton marginLeft={30} noOutline type={FusebitSocialType.twitter} small />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export type FusebitFooterProps = {} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitFooter({ ...rest }: FusebitFooterProps) {
  return (
    <>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion {...rest} />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion {...rest} />
      </MediaQuery>
    </>
  );
}
