import React from 'react';
import styled from 'styled-components';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitLink, FusebitLinkProps } from '@5qtrs/fusebit-link';
import { FusebitText, FusebitTextProps, FusebitTextType } from '@5qtrs/fusebit-text';
import { AboutUsIcon, DocsIcon, BlogIcon } from '@5qtrs/fusebit-icon';

const gaCategoryDefault = 'Navigation';
const gaActionDefault = 'Clicked';
const gaLabelDefault = location.pathname;

// -------------------
// Internal Components
// -------------------

type StyledBoxProps = {
  hover: FusebitColor;
  noHover: boolean;
} & BoxProps;

const StyledBox = styled(Box)<StyledBoxProps>`
  position: relative;

  &:hover::after {
    opacity: ${(props) => (props.noHover ? 0 : 1)};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 0px;
    width: 100%;
    height: 3px;
    border-radius: 100px;
    background: ${(props) => props.hover};
    opacity: 0;
  }
`;

// --------------
// Exported Types
// --------------

export enum FusebitNavLinkType {
  about = 'About Us',
  docs = 'Docs',
  blog = 'Blog',
  terms = 'Terms of Use',
  privacy = 'Privacy Policy',
  copyRight = '© 2019-2021 Fusebit - All Rights Reserved',
}

export type FusebitNavLinkProps = {
  noIcon?: boolean;
  linkType?: FusebitNavLinkType;
} & FusebitLinkProps &
  BoxProps &
  FusebitTextProps;

// -------------------
// Exported Components
// -------------------

export function FusebitNavLink({
  font,
  weight,
  type,
  fontSize,
  lineHeight,
  inline,
  children,
  color,
  hover,
  to,
  href,
  openTab,
  noHover,
  visited,
  noVisit,
  gaCategory,
  gaAction,
  gaLabel,
  noIcon,
  linkType,
  ...rest
}: FusebitNavLinkProps) {
  let icon = undefined;
  let styledHover = true;
  to = to || '/';

  switch (linkType) {
    case FusebitNavLinkType.about:
      color = color || FusebitColor.black;
      hover = hover || FusebitColor.red;
      icon = <AboutUsIcon color={color} />;
      to = '/about';
      gaCategory = gaCategoryDefault;
      gaAction = 'Clicked about nav';
      gaLabel = gaLabelDefault;
      break;
    case FusebitNavLinkType.docs:
      color = color || FusebitColor.black;
      hover = hover || FusebitColor.red;
      icon = <DocsIcon color={color} />;
      href = '/docs';
      gaCategory = gaCategoryDefault;
      gaAction = 'Clicked docs nav';
      gaLabel = gaLabelDefault;
      break;
    case FusebitNavLinkType.blog:
      color = color || FusebitColor.black;
      hover = hover || FusebitColor.red;
      icon = <BlogIcon color={color} />;
      to = '/blog';
      gaCategory = gaCategoryDefault;
      gaAction = 'Clicked blog nav';
      gaLabel = gaLabelDefault;
      break;
    case FusebitNavLinkType.privacy:
      color = color || opacity(FusebitColor.white, 0.4);
      hover = hover || FusebitColor.white;
      type = type || FusebitTextType.bodySmall;
      styledHover = false;
      noHover = true;
      to = '/privacy';
      gaCategory = gaCategoryDefault;
      gaAction = 'Clicked privacy nav';
      gaLabel = gaLabelDefault;
      break;
    case FusebitNavLinkType.terms:
      color = color || opacity(FusebitColor.white, 0.4);
      hover = hover || FusebitColor.white;
      type = type || FusebitTextType.bodySmall;
      styledHover = false;
      noHover = true;
      to = '/terms';
      gaCategory = gaCategoryDefault;
      gaAction = 'Clicked terms nav';
      gaLabel = gaLabelDefault;
      break;
    default:
      color = color || opacity(FusebitColor.white, 0.4);
      hover = hover || FusebitColor.white;
      type = type || FusebitTextType.bodySmall;
      styledHover = false;
      noHover = true;
      to = '/';
      break;
  }

  icon = noIcon ? undefined : icon;

  return (
    <StyledBox middle noWrap hover={hover} noHover={noHover === true} {...rest}>
      <FusebitLink
        to={!href ? to : undefined}
        href={href}
        gaCategory={gaCategory}
        gaAction={gaAction}
        gaLabel={gaLabel}
        openTab={openTab}
        color={color}
      >
        <Box middle noWrap>
          {icon}
          {icon ? <Box width={8} /> : undefined}
          <FusebitText
            type={type}
            font={font}
            weight={weight}
            fontSize={fontSize}
            inline={inline}
            color={color}
            hover={styledHover ? undefined : hover}
          >
            {linkType}
          </FusebitText>
        </Box>
      </FusebitLink>
    </StyledBox>
  );
}
