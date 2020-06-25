import React from 'react';
import { Box } from '@5qtrs/box';
import { FusebitButton, FusebitButtonProps } from '@5qtrs/fusebit-button';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { TwitterIcon, LinkedInIcon } from '@5qtrs/fusebit-icon';

// ------------------
// Internal Constants
// ------------------

const twitterBlue: FusebitColor = '#1DA1F2' as FusebitColor;
const twitterBlueClick: FusebitColor = 'hsla(203, 89%, 53%, 0.1)' as FusebitColor;
const linkedInBlue: FusebitColor = '#0B7DC3' as FusebitColor;
const linkedInBlueClick: FusebitColor = 'hsla(203, 89% , 40%, 0.1)' as FusebitColor;

// --------------
// Exported Types
// --------------

export enum FusebitSocialType {
  twitter = 'twitter',
  linkedIn = 'linkedIn',
}

export type FusebitSocialButtonProps = {
  color?: FusebitColor;
  invertColor?: boolean;
  small?: boolean;
  noOutline?: boolean;
  share?: boolean;
  type: FusebitSocialType;
} & FusebitButtonProps;

// -------------------
// Exported Components
// -------------------

export function FusebitSocialButton({
  href,
  type,
  color,
  small,
  share,
  invertColor,
  noOutline,
  ...rest
}: FusebitSocialButtonProps) {
  const clickColor = color ? undefined : FusebitSocialType.twitter ? twitterBlueClick : linkedInBlueClick;
  color = color || (type === FusebitSocialType.twitter ? twitterBlue : linkedInBlue);

  href =
    href ||
    (type === FusebitSocialType.twitter ? 'https://twitter.com/fusebitio' : 'https://www.linkedin.com/company/fusebit');

  return (
    <FusebitButton
      openTab
      href={href}
      width={share ? undefined : small ? 40 : 48}
      small={small}
      outline={!invertColor && !noOutline}
      color={!invertColor && noOutline ? FusebitColor.white : color}
      clickColor={invertColor ? undefined : clickColor}
      {...rest}
    >
      <Box middle center>
        {type === FusebitSocialType.twitter ? (
          <TwitterIcon size={small ? 14 : 18} color={invertColor ? FusebitColor.white : color} />
        ) : (
          <LinkedInIcon size={small ? 14 : 18} color={invertColor ? FusebitColor.white : color} />
        )}
        {share ? (
          <Box marginLeft={small ? 10 : 14}>{type === FusebitSocialType.twitter ? 'Tweet' : 'Share'}</Box>
        ) : undefined}
      </Box>
    </FusebitButton>
  );
}
