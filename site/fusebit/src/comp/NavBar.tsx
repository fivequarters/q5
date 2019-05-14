import { FaTwitter } from '@5qtrs/icon';
import { NavBar as NavBarBase, NavBarSpacer } from '@5qtrs/nav-bar';
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { applyTheme } from '../util';
import { Text } from './Text';
import { outboundLink } from './OutboundLink';

const Container = styled.div`
  position: relative;
  z-index: 1;
`;

const StyledNavBar = styled(NavBarBase)`
  ${props => applyTheme(props, 'navbar')}
`;

const AboveNavBar = styled.div`
  width: 100%;
  padding: 10px;
  ${props => applyTheme(props, 'navbar', 'announcement')}
`;

const CorpName = styled.h1`
  margin: auto 20px;
  padding-top: 3px;
  @media screen and (max-width: 500px) {
    margin-right: 10px;
    margin-left: 10px;
  }
  ${props => applyTheme(props, 'navbar', 'corporateName')}
`;

const Link = styled.a`
  margin: auto 20px auto 0;
  text-decoration: inherit;
  @media screen and (max-width: 500px) {
    margin-right: 10px;
  }
  ${props => applyTheme(props, 'navbar', 'link')}
`;

const Twitter = styled(FaTwitter)`
  ${props => applyTheme(props, 'navbar', 'twitter')}
`;

export function NavBar() {
  const context = useContext(ThemeContext);

  function mailClick() {
    outboundLink('mailto:contact@fusebit.io');
    return false;
  }

  function twitterClick() {
    outboundLink('https://twitter.com/fusebitio', undefined, '_blank');
    return false;
  }

  return (
    <Container>
      {/* <AboveNavBar>{content.announcement}</AboveNavBar> */}
      <StyledNavBar sticky={false}>
        {/* <CorpLogo {...logoTheme} /> */}
        <CorpName>
          <Text content="Fusebit" />
        </CorpName>
        <NavBarSpacer />
        <Link href="/docs">Docs</Link>
        <Link onClick={mailClick}>contact@fusebit.io</Link>
        <Link href="https://twitter.com/fusebitio" target="_blank" onClick={twitterClick}>
          <Twitter />
        </Link>
      </StyledNavBar>
    </Container>
  );
}
