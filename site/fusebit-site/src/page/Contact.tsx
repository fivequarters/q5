import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitText as Text, FusebitTextType as TextType, FusebitTextWeight as TextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor as Color } from '@5qtrs/fusebit-color';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import {
  FusebitPage as Page,
  FusebitSection as Section,
  FusebitQuote as Quote,
  FusebitBreak as Break,
} from '@5qtrs/fusebit-page';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import {
  PuzzleIcon,
  EmptyTagIcon,
  FourBoxesIcon,
  ShieldIcon,
  NetworkFileIcon,
  OrgChartIcon,
} from '@5qtrs/fusebit-icon';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

function ContactOption({ icon, heading, children }: any) {
  return (
    <>
      <Box center middle noWrap marginBottom={20}>
        <Box center middle background={FusebitColor.red} padding={12} borderRadius={10}>
          {icon}
        </Box>
      </Box>
      {/* <FusebitText type={FusebitTextType.bodyLarge}>{children}</FusebitText> */}
      {children}
    </>
  );
}

function SlackContactOption() {
  return (
    <ContactOption icon={<PuzzleIcon size={52} />}>
      <FusebitText>
        <Link openTab href="https://fusebitio.slack.com/">
          Slack
        </Link>
      </FusebitText>
      <FusebitText>
        {/* Regenerate the invite link every 2000ppl who join Slack */}(
        <Link openTab href="https://join.slack.com/t/fusebitio/shared_invite/zt-qe7uidtf-4cs6OgaomFVgAF_fQZubfg">
          get invited
        </Link>{' '}
        first)
      </FusebitText>
    </ContactOption>
  );
}

function DiscordContactOption() {
  return (
    <ContactOption icon={<PuzzleIcon size={52} />}>
      <FusebitText>
        <Link openTab href="https://discord.gg/kbw63AmWP9">
          Discord
        </Link>
      </FusebitText>
    </ContactOption>
  );
}

function EmailContactOption() {
  return (
    <ContactOption icon={<PuzzleIcon size={52} />}>
      <FusebitText>
        <Link href="mailto:contact@fusebit.io">contact@fusebit.io</Link>
      </FusebitText>
    </ContactOption>
  );
}

function MobileVersion() {
  return (
    <Box>
      <Box center middle marginTop={30} marginBottom={20} vertical>
        <SlackContactOption />
      </Box>
      <Box center middle marginTop={30} marginBottom={20} vertical>
        <DiscordContactOption />
      </Box>
      <Box center middle marginTop={30} marginBottom={20} vertical>
        <EmailContactOption />
      </Box>
    </Box>
  );
}

function NonMobileVersion() {
  return (
    <Box gap={30}>
      <Box center middle marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
        <SlackContactOption />
      </Box>
      <Box center middle marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
        <DiscordContactOption />
      </Box>
      <Box center middle marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
        <EmailContactOption />
      </Box>
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function Contact() {
  return (
    <Page header="Get in touch">
      <FusebitSection maxWidth={1200}>
        <MediaQuery mediaType={MediaType.mobile}>
          <MobileVersion />
        </MediaQuery>
        <MediaQuery mediaType={MediaType.allExceptMobile}>
          <NonMobileVersion />
        </MediaQuery>
      </FusebitSection>
    </Page>
  );
}
