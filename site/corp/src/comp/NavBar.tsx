import { CorpLogo } from '@5qtrs/corp-logo';
import { FaTwitter } from '@5qtrs/icon';
import { NavBar as NavBarBase, NavBarSpacer } from '@5qtrs/nav-bar';
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { content } from '../content';
import { applyTheme, getTheme } from '../util';
import { Text } from './Text';

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

const CorpName = styled.div`
  margin: auto 10px;
  padding-top: 3px;
  ${props => applyTheme(props, 'navbar', 'corporateName')}
`;

const Link = styled.a`
  margin: auto 20px;
  text-decoration: inherit;
  ${props => applyTheme(props, 'navbar', 'link')}
`;

const Twitter = styled(FaTwitter)`
  ${props => applyTheme(props, 'navbar', 'twitter')}
`;

export function NavBar() {
  const context = useContext(ThemeContext);
  const logoTheme = getTheme(context, 'navbar', 'logo');
  const twitterTheme = getTheme(context, 'navbar', 'twitter');

  return (
    <Container>
      <AboveNavBar>{content.announcement}</AboveNavBar>
      <StyledNavBar sticky={true}>
        <CorpLogo {...logoTheme} />
        <CorpName>
          <Text content={content.coporateName || ''} />
        </CorpName>
        <NavBarSpacer />
        <Link href="#about_us">About Us</Link>
        <Link href={content.corporateTwitter} target="_blank">
          <Twitter size={twitterTheme.size || 15} />
        </Link>
      </StyledNavBar>
    </Container>
  );
}
