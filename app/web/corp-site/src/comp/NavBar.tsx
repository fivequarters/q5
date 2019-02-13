import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { CorpLogo } from '@5qtrs/corp-logo';
import { NavBar as NavBarBase, NavBarSpacer } from '@5qtrs/nav-bar';
import { applyTheme, getTheme } from '../util';

const StyledNavBar = styled(NavBarBase)`
  ${props => applyTheme(props, 'navbar')}
`;

const AboveNavBar = styled.div`
  width: 100%;
  padding: 10px;
  ${props => applyTheme(props, 'navbar', 'announcement')}
`;

const CorpName = styled.div`
  margin: auto 20px;
  ${props => applyTheme(props, 'navbar', 'corporateName')}
`;

const Link = styled.a`
  margin: auto 20px;
  text-decoration: inherit;
  ${props => applyTheme(props, 'navbar', 'link')}
`;

export function NavBar() {
  const context = useContext(ThemeContext);
  const theme = getTheme(context, 'navbar', 'logo');
  const color = theme.color || 'black';

  return (
    <div>
      <AboveNavBar>We're just getting started. Check back soon.</AboveNavBar>
      <StyledNavBar sticky>
        <CorpLogo size={50} strokeWidth={4} color={color} />
        <CorpName>Five Quarters</CorpName>
        <NavBarSpacer />
        <Link href="#about_us">About Us</Link>
      </StyledNavBar>
    </div>
  );
}
