import { Box } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { DiscordIcon, MailIcon, SlackIcon } from '@5qtrs/fusebit-icon';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitPage as Page, FusebitSection } from '@5qtrs/fusebit-page';
import { FusebitText } from '@5qtrs/fusebit-text';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import React from 'react';

// ------------------
// Internal Constants
// ------------------

function ContactOption({ icon, heading, href, children }: any) {
  return (
    <>
      <Box center middle noWrap marginBottom={20}>
        <Link openTab href={href}>
          <Box center middle background={FusebitColor.red} padding={24} borderRadius={20}>
            {icon}
          </Box>
        </Link>
      </Box>
      {children}
    </>
  );
}

function SlackContactOption() {
  return (
    <ContactOption icon={<SlackIcon size={104} />} href={'https://fusebitio.slack.com/'}>
      <FusebitText>
        <Link openTab href="https://fusebitio.slack.com/">
          Slack
        </Link>
      </FusebitText>
      <FusebitText>
        {/* Regenerate the invite link every 2000ppl who join Slack */}(
        <Link openTab href="https://join.slack.com/t/fusebitio/shared_invite/zt-qe7uidtf-4cs6OgaomFVgAF_fQZubfg">
          get invited
        </Link>
        )
      </FusebitText>
    </ContactOption>
  );
}

function DiscordContactOption() {
  return (
    <ContactOption icon={<DiscordIcon size={104} />} href={'https://discord.gg/kbw63AmWP9'}>
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
    <ContactOption icon={<MailIcon size={104} />} href={'mailto:contact@fusebit.io'}>
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
