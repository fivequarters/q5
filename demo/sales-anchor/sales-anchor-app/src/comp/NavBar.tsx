import { GoChevronDown } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import { Box } from '@5qtrs/box';
import { NavBar as NavBarBase } from '@5qtrs/nav-bar';
import React, { useContext } from 'react';
import styled from 'styled-components';
import { ApiContext } from './ApiContext';
import { Logo } from './Logo';

// -------------------
// Internal Components
// -------------------

const AboveNavBar = styled.div`
  background-color: #34495e;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  color: white;
  font-family: 'Roboto', san-serif;
`;

const NavBarStyled = styled(NavBarBase)`
  font-family: 'Raleway', san-serif;
  font-size: 28px;
  font-weight: 300;
  color: #34495e;
  align-items: center;
  border-bottom: 1px solid #d6dbdf;
  background-color: white;
  z-index: 999;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  font-family: 'Roboto', san-serif;
`;

const UserNameAndRole = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0px 15px;
`;

const UserName = styled.div`
  font-size: 14px;
  margin: 5px;
  margin-top: 0px;
  color: #34495e;
`;

const UserRole = styled.div`
  font-size: 12px;
  color: #34495e;
`;

// -------------------
// Exported Components
// -------------------

export function NavBar() {
  const api = useContext(ApiContext);

  return (
    <div>
      <NavBarStyled sticky={true}>
        <Logo />
        <Box expand />
        <UserProfile>
          <Image src={api.imageUrl} style={{ width: 50, height: 50 }} />
          <UserNameAndRole>
            <UserName>{api.name}</UserName>
            <UserRole>Admin</UserRole>
          </UserNameAndRole>
          <GoChevronDown style={{ fontSize: 10 }} />
        </UserProfile>
      </NavBarStyled>
    </div>
  );
}
