import { GoQuestion } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React from 'react';
import styled from 'styled-components';
import { outlineGray } from '../../assets/img/circle-outline-gray.png';
import { outlineWhite } from '../../assets/img/circle-outline-white.png';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledImage = styled(Image)`
  position: absolute;
  top: 0px;
  left: 0px;
  border: 0px;
`;

const ProfilePicture = styled.div`
  position: relative;
  margin-top: -25px;
  margin-right: 35px;
`;

const UserName = styled.div`
  &.unassigned {
    margin-left: 10px;
    color: #c0392b;
  }
`;

// --------------
// Exported Types
// --------------

export interface IUserProfileProps {
  profilePicture?: string;
  name?: string;
  oddRow: boolean;
}

// -------------------
// Exported Components
// -------------------

export function SalesAgent({ profilePicture, name, oddRow }: IUserProfileProps) {
  const outline = oddRow ? outlineGray : outlineWhite;
  const style = { width: 25, height: 25, color: '#c0392b' };
  name = name || 'Unassigned';
  const picture = profilePicture ? (
    <ProfilePicture>
      <StyledImage style={style} src={profilePicture} />
      <StyledImage style={style} src={outline} />
    </ProfilePicture>
  ) : (
    <GoQuestion style={style} />
  );
  return (
    <Container>
      {picture}
      <UserName className={profilePicture ? '' : 'unassigned'}>{name}</UserName>
    </Container>
  );
}
