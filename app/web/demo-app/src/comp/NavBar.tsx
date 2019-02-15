import React from 'react';
import styled from 'styled-components';
import { NavBar as NavBarBase, NavBarSpacer } from '@5qtrs/nav-bar';
import { TiAnchor } from 'react-icons/ti';
import { GoChevronDown } from 'react-icons/go';
import { Image } from '@5qtrs/image';

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

const Product = styled.div`
  display: flex;
  flex-direction: column;
  font-family: 'Raleway', san-serif;
  font-weight: 300;
`;

const ProdutName = styled.div`
  font-size: 28px;
  font-weight: 300;
`;

const ProductTagLine = styled.div`
  font-size: 10px;
  text-align: center;
  color: #c0392b;
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
  return (
    <div>
      {/* <AboveNavBar>This Demo Illustrations Embedding 5Q Functions</AboveNavBar> */}
      <NavBarStyled sticky>
        <TiAnchor style={{ fontSize: 40 }} />
        <Product>
          <ProdutName>Sales Anchor</ProdutName>
          <ProductTagLine>Never Let a Sale Drift Away</ProductTagLine>
        </Product>
        <NavBarSpacer />
        <UserProfile>
          <Image src="../../assets/img/admin.png" style={{ width: 50, height: 50 }} />
          <UserNameAndRole>
            <UserName>James Davidson</UserName>
            <UserRole>Admin</UserRole>
          </UserNameAndRole>
          <GoChevronDown style={{ fontSize: 10 }} />
        </UserProfile>
      </NavBarStyled>
    </div>
  );
}
