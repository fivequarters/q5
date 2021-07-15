import { Box } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { DiscordIcon, MailIcon, SlackIcon } from '@5qtrs/fusebit-icon';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitBreak, FusebitPage as Page, FusebitSection } from '@5qtrs/fusebit-page';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import React from 'react';

// ------------------
// Internal Constants
// ------------------

function ContactOption({ icon, heading, href, children }: any) {
  return (
    <>
      <Box middle noWrap marginBottom={20}>
        <Link openTab href={href}>
          <Box background={FusebitColor.red} padding={12} marginRight={20} borderRadius={5}>
            {icon}
          </Box>
        </Link>
        <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
          {children}
        </FusebitText>
      </Box>
    </>
  );
}

function SlackContactOption() {
  return (
    <ContactOption icon={<SlackIcon />} href={'https://fusebitio.slack.com/'}>
      <FusebitText>
        <Link openTab href="https://fusebitio.slack.com/">
          Fusebit Community Slack
        </Link>
      </FusebitText>
      <FusebitText>
        Request invitation&nbsp;
        {/* Regenerate the invite link every 2000ppl who join Slack */}
        <Link openTab href="https://join.slack.com/t/fusebitio/shared_invite/zt-qe7uidtf-4cs6OgaomFVgAF_fQZubfg">
          here
        </Link>
      </FusebitText>
    </ContactOption>
  );
}

function DiscordContactOption() {
  return (
    <ContactOption icon={<DiscordIcon />} href={'https://discord.gg/gphkyNZbHv'}>
      <FusebitText>
        <Link openTab href="https://discord.gg/gphkyNZbHv">
          Discord Community
        </Link>
      </FusebitText>
    </ContactOption>
  );
}

function EmailContactOption() {
  return (
    <ContactOption icon={<MailIcon />} href={'mailto:contact@fusebit.io'}>
      <FusebitText>
        <Link href="mailto:contact@fusebit.io">contact@fusebit.io</Link>
      </FusebitText>
    </ContactOption>
  );
}

// -------------------
// Exported Components
// -------------------

export function Contact() {
  return (
    <Page header="Get In Touch">
      <FusebitSection marginBottom={60}>
        <Box width="100%" marginBottom={80}>
          <Box expand={1} marginRight={40} minWidth={300} marginBottom={40}>
            We love hearing feedback from customers - that's you! Please use your preferred method to reach out.
            <FusebitBreak />
            Even better, we would love for you to be part of our community. We are on Slack and Discord 24/7, happy to
            talk integrations.
            <FusebitBreak />
            We are looking forward to hearing from you!
          </Box>
          <Box expand width="100%" minWidth={300}>
            <Box middle marginRight={20} vertical expand minWidth={260} maxWidth={400}>
              <SlackContactOption />
            </Box>
            <Box middle marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
              <DiscordContactOption />
            </Box>
            <Box middle marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
              <EmailContactOption />
            </Box>
          </Box>
        </Box>
      </FusebitSection>
    </Page>
  );
}
