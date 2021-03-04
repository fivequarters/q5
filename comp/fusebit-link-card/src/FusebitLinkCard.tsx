import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { Image } from '@5qtrs/image';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitLink } from '@5qtrs/fusebit-link';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';

// ------------------
// Internal Constants
// ------------------

const defaultButtonText = 'Read More';
const gaCategoryDefault = 'Link';
const gaActionDefault = 'Clicked Read More Blog Link';
const gaLabelDefault = location.pathname;

// ------------------
// Internal Functions
// ------------------

function truncate(text: string, length: number) {
  if (text.length < length) {
    return text;
  }

  let index = length;
  while (text[index] !== ' ') {
    index--;
    if (index === 0) {
      return `${text.slice(0, length)}...`;
    }
  }
  return `${text.slice(0, index)}...`;
}

// -------------------
// Internal Components
// -------------------

function SmallVersion({ title, subtitle, imageSrc, summary, gap, href, to, ...rest }: FusebitLinkCardProps) {
  return (
    <Box width="100%" noWrap {...rest}>
      {imageSrc ? (
        <Box>
          <FusebitLink href={href} to={to}>
            <Image src={imageSrc} borderRadius={25} height={100} width={100} />
          </FusebitLink>
        </Box>
      ) : undefined}
      <Box vertical marginLeft={20}>
        <FusebitLink href={href} to={to}>
          <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
            {title}
          </FusebitText>
          <Box marginTop={10} minWidth={200}>
            <FusebitText type={FusebitTextType.bodySmall}>{subtitle}</FusebitText>
          </Box>
        </FusebitLink>
      </Box>
    </Box>
  );
}

function MediumVersion({ title, subtitle, imageSrc, to, href, summary, buttonText, ...rest }: FusebitLinkCardProps) {
  if (summary) {
    summary = truncate(summary, 205);
  }
  return (
    <Box vertical marginBottom={20} maxWidth={360} width="100%" {...rest}>
      {imageSrc ? (
        <Box width="100%" marginBottom={20}>
          <FusebitLink href={href} to={to}>
            <Image src={imageSrc} borderRadius={25} maxWidth={360} height={200} />
          </FusebitLink>
        </Box>
      ) : undefined}
      <Box height={100}>
        <FusebitLink href={href} to={to}>
          <FusebitText type={FusebitTextType.header3}>
            {title}
            {subtitle ? ` - ${subtitle}` : ''}
          </FusebitText>
        </FusebitLink>
      </Box>
      <Box marginTop={40}>
        <FusebitText type={FusebitTextType.bodySmall}>{summary}</FusebitText>
      </Box>
      <FusebitButton
        href={href}
        to={to}
        marginTop={20}
        outline
        gaCategory={gaCategoryDefault}
        gaAction={gaActionDefault}
        gaLabel={gaLabelDefault}
      >
        {buttonText || defaultButtonText}
      </FusebitButton>
    </Box>
  );
}

function MobileVersion({ title, subtitle, imageSrc, to, href, summary, buttonText, ...rest }: FusebitLinkCardProps) {
  return (
    <Box width="100%" {...rest}>
      <Box expand={2} vertical marginBottom={20}>
        <FusebitLink href={href} to={to}>
          <FusebitText type={FusebitTextType.header3}>{title}</FusebitText>
          <FusebitText type={FusebitTextType.bodyLarge}>{subtitle}</FusebitText>
        </FusebitLink>
        <Box height={20} />
        {imageSrc ? (
          <Box width="100%" marginBottom={20}>
            <FusebitLink href={href} to={to}>
              <Image src={imageSrc} borderRadius={25} />
            </FusebitLink>
          </Box>
        ) : undefined}
        <FusebitText>{summary}</FusebitText>
        <FusebitButton
          href={href}
          to={to}
          marginTop={20}
          outline
          gaCategory={gaCategoryDefault}
          gaAction={gaActionDefault}
          gaLabel={gaLabelDefault}
        >
          {buttonText || defaultButtonText}
        </FusebitButton>
      </Box>
    </Box>
  );
}

function NonMobileVersion({ title, subtitle, imageSrc, to, href, summary, buttonText, ...rest }: FusebitLinkCardProps) {
  return (
    <Box width="100%" {...rest} marginTop={20}>
      <Box expand={1.5} vertical marginBottom={20} minWidth={300} marginRight={40}>
        <FusebitLink to={to} href={href}>
          <FusebitText type={FusebitTextType.header3}>{title}</FusebitText>
          <FusebitText type={FusebitTextType.bodyLarge}>{subtitle}</FusebitText>
        </FusebitLink>
        <Box height={20} />
        <FusebitText>{summary}</FusebitText>
        <FusebitButton
          to={to}
          href={href}
          marginTop={20}
          outline
          gaCategory={gaCategoryDefault}
          gaAction={gaActionDefault}
          gaLabel={gaLabelDefault}
        >
          {buttonText || defaultButtonText}
        </FusebitButton>
      </Box>
      {imageSrc ? (
        <Box expand minWidth={300} marginBottom={20}>
          <FusebitLink to={to} href={href}>
            <Image src={imageSrc} borderRadius={25} />
          </FusebitLink>
        </Box>
      ) : undefined}
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export enum FusebitLinkCardType {
  large = 'large',
  medium = 'medium',
  small = 'small',
}

export type FusebitLinkCardProps = {
  type?: FusebitLinkCardType;
  title: string;
  subtitle?: string;
  summary?: string;
  imageSrc?: string;
  href?: string;
  to?: string;
  buttonText?: string;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitLinkCard({ type, ...rest }: FusebitLinkCardProps) {
  type = type || FusebitLinkCardType.large;

  if (type === FusebitLinkCardType.small) {
    return <SmallVersion {...rest} />;
  } else if (type === FusebitLinkCardType.medium) {
    return <MediumVersion {...rest} />;
  }

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
