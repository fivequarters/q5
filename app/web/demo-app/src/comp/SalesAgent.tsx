import React from 'react';
import styled from 'styled-components';
import { GoQuestion } from 'react-icons/go';
import { Image } from '@5qtrs/image';

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

export type UserProfileProps = {
  profilePicture?: string;
  name?: string;
  oddRow: boolean;
};

// -------------------
// Exported Components
// -------------------

export function SalesAgent({ profilePicture, name, oddRow }: UserProfileProps) {
  const outline = oddRow ? '../../assets/img/circle-outline-gray.png' : '../../assets/img/circle-outline-white.png';
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
