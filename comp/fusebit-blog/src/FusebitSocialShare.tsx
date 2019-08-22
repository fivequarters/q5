import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitSocialButton, FusebitSocialType, FusebitSocialButtonProps } from '@5qtrs/fusebit-social';
import { FusebitPostMeta } from './FusebitPostMeta';
import { FusebitPostUrl } from './FusebitPostUrl';

// ------------------
// Internal Functions
// ------------------

function getTwitterUrl(shareText: string, postUrl: string) {
  return [
    `https://twitter.com/intent/tweet?original_referer=${encodeURIComponent(postUrl)}`,
    `&text=${encodeURIComponent(shareText)}`,
    `&url=${encodeURIComponent(postUrl)}`,
    `&via=fusebitio`,
  ].join('');
}

function getLinkedInUrl(shareText: string, postUrl: string, title: string) {
  return [
    `http://www.linkedin.com/shareArticle?mini=true&original_referer=${encodeURIComponent(postUrl)}`,
    `&summary=${encodeURIComponent(shareText)}`,
    `&title=${encodeURIComponent(title)}`,
    `&url=${encodeURIComponent(postUrl)}`,
    `&source=fusebit.io`,
  ].join('');
}

// -------------------
// Internal Components
// -------------------

function SocialShareButton({ type, href }: FusebitSocialButtonProps) {
  return <FusebitSocialButton type={type} small invertColor share href={href} />;
}

function SocialShareButtons(props: FusebitSocialShareProps) {
  const { title, shareText, width, twitterShareText, linkedInShareText, ...rest } = props;
  const twitterShare = twitterShareText || shareText;
  const linkedInShare = linkedInShareText || shareText;
  const postUrl = FusebitPostUrl.createFromMeta(props);
  const twitterUrl = twitterShare ? getTwitterUrl(twitterShare, postUrl.absoluteUrl()) : undefined;
  const linkedInUrl = linkedInShare ? getLinkedInUrl(linkedInShare, postUrl.absoluteUrl(), title) : undefined;

  if (!twitterUrl && !linkedInUrl) {
    return null;
  }

  return (
    <Box width={width || '100%'} {...rest}>
      {linkedInUrl ? <SocialShareButton type={FusebitSocialType.linkedIn} href={linkedInUrl} /> : undefined}
      {linkedInUrl && twitterUrl ? <Box width={20} /> : undefined}
      {twitterUrl ? <SocialShareButton type={FusebitSocialType.twitter} href={twitterUrl} /> : undefined}
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export type FusebitSocialShareProps = FusebitPostMeta & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitSocialShare({ ...rest }: FusebitSocialShareProps) {
  return (
    <>
      <MediaQuery mediaType={MediaType.mobile}>
        <SocialShareButtons {...rest} />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <SocialShareButtons {...rest} />
      </MediaQuery>
    </>
  );
}
