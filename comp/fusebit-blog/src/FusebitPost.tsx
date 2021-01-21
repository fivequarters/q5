import React from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { Image } from '@5qtrs/image';
import { ScrollStick } from '@5qtrs/scroll-stick';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitPage, FusebitSection } from '@5qtrs/fusebit-page';
import { FusebitLink } from '@5qtrs/fusebit-link';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitPostMeta } from './FusebitPostMeta';
import { FusebitPostUrl } from './FusebitPostUrl';
import { FusebitPostAuthor } from './FusebitPostAuthor';
import { FusebitSocialShare } from './FusebitSocialShare';

// ------------------
// Internal Constants
// ------------------

// ------------------
// Internal Functions
// ------------------

function preventDefault(event: any) {
  event.preventDefault();
}

// -------------------
// Internal Components
// -------------------

const StickyBox = styled(Box)`
  position: sticky;
  top: 120px;
  padding-left: 40px;
  @media only screen and (max-width: 782px) {
    padding-left: 0px;
    width: 100%;
  }
`;

function TableOfContents({ children, width, year, month, day, postId, ...rest }: FusebitPostProps) {
  const links: any[] = [];

  if (React.Children.count(children) === 1) {
    React.Children.forEach(children, (child: any) => {
      if (child.type && child.type === React.Fragment && child.props && child.props.children) {
        children = child.props.children;
      }
    });
  }

  React.Children.forEach(children, (child: any) => {
    if (child && child.props) {
      const props = child.props;
      if (props.id && props.header) {
        const postUrl = FusebitPostUrl.create(year, month, day, postId);
        links.push(
          <li key={props.id}>
            <FusebitLink noVisit to={postUrl.relativeUrl(props.id)} onClick={preventDefault}>
              {props.tocText || props.header}
            </FusebitLink>
          </li>
        );
      }
    }
  });
  return (
    (links.length && (
      <Box vertical width={width || '100%'} {...rest}>
        <FusebitText type={FusebitTextType.header3}>Table of Contents</FusebitText>
        <ul style={{ marginLeft: -20 }}>
          <FusebitText>{links}</FusebitText>
        </ul>
        <Box width="100%" height={1} background={opacity(FusebitColor.gray, 0.3)} />
      </Box>
    )) ||
    null
  );
}

function MobileVersion(props: FusebitPostProps) {
  const { title, subtitle, children, imageSrc, maxWidth, ...rest } = props;

  return (
    <FusebitPage>
      <FusebitSection marginBottom={40}>
        <Box vertical width="100%" {...rest}>
          <Box vertical marginBottom={40}>
            <FusebitText type={FusebitTextType.bodySmall} color={FusebitColor.red}>
              THE FUSEBIT BLOG
            </FusebitText>
            <Box height={10} />
            <FusebitText fontSize={28} lineHeight={34} type={FusebitTextType.header1}>
              {title}
            </FusebitText>
            <Box height={10} />
            <FusebitText type={FusebitTextType.header3}>{subtitle}</FusebitText>
          </Box>
        </Box>
        <FusebitPostAuthor marginBottom={20} {...props} />
        {imageSrc ? <Image src={imageSrc} marginBottom={20} expand width="100%" borderRadius={25} /> : undefined}
        <TableOfContents paddingTop={40} {...props}>
          {children}
        </TableOfContents>
        <FusebitSocialShare {...props} marginTop={20} />
      </FusebitSection>
      {children}
      <FusebitSocialShare center {...props} marginBottom={40} />
    </FusebitPage>
  );
}

function NonMobileVersion(props: FusebitPostProps) {
  const { title, subtitle, children, imageSrc, maxWidth, ...rest } = props;
  return (
    <FusebitPage>
      <FusebitSection>
        <Box>
          <Box vertical minWidth={460} marginRight={20} marginBottom={20}>
            <FusebitText type={FusebitTextType.bodySmall} color={FusebitColor.red}>
              THE FUSEBIT BLOG
            </FusebitText>
            <FusebitText type={FusebitTextType.header1}>{title}</FusebitText>
            <FusebitText type={FusebitTextType.header3}>{subtitle}</FusebitText>
            <Box expand minHeight={40} />
            <FusebitPostAuthor marginBottom={20} {...props} />
            {imageSrc ? (
              <Image src={imageSrc} expand marginBottom={20} height={500} width="100%" borderRadius={25} />
            ) : undefined}
          </Box>
        </Box>
      </FusebitSection>
      <Box width="100vw" center marginTop={20} marginLeft={-20} marginRight={-20} paddingLeft={20} paddingRight={20}>
        <Box maxWidth={1000} right style={{ flexDirection: 'row-reverse' }}>
          <Box expand center width="23%" minWidth={260} stretch paddingBottom={40}>
            <StickyBox vertical>
              <TableOfContents {...props}>{children}</TableOfContents>
              <FusebitSocialShare marginTop={20} {...props} />
            </StickyBox>
          </Box>
          <Box expand width="65%" paddingBottom={40}>
            {children}
          </Box>
        </Box>
      </Box>
    </FusebitPage>
  );
}

// --------------
// Exported Types
// --------------

export type FusebitPostProps = FusebitPostMeta & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitPost({ ...rest }: FusebitPostProps) {
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
