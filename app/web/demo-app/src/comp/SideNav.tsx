import React, { useState } from 'react';
import styled from 'styled-components';
import { GoInbox, GoCheck, GoClock, GoQuote, GoPerson, GoGlobe, GoGear, GoTools } from 'react-icons/go';
import { MdDomain } from 'react-icons/md';
import { FaBolt } from 'react-icons/fa';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #34495e;
  padding: 20px;
  padding-top: 60px;
`;

const SideNavItem = styled.div`
  display: flex;
  align-items: center;
  justify-items: center;
  margin: 7px 0px;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
  &.selected {
    color: #c0392b;
  }
`;

const SideNavIcon = styled.span`
  font-size: 20px;
  padding-top: 5px;
`;

const SideNavLabel = styled.span`
  margin: auto 10px;
`;

const Divider = styled.div`
  border-top: 1px solid #d6dbdf;
  height: 0px;
  margin: 10px 20px 10px 5px;
`;

// --------------
// Exported Types
// --------------

export type SideNavProps = {
  selection: string;
  onSelection: (selection: string) => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function SideNav({ selection, onSelection }: SideNavProps) {
  return (
    <Container>
      <SideNavItem
        className={selection === 'New Inquiries' ? 'selected' : ''}
        onClick={() => onSelection('New Inquiries')}
      >
        <SideNavIcon>
          <GoInbox />
        </SideNavIcon>
        <SideNavLabel>New Inquiries</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoCheck />
        </SideNavIcon>
        <SideNavLabel>Qualified Leads</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoQuote />
        </SideNavIcon>
        <SideNavLabel>Contract Negotiations</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoClock />
        </SideNavIcon>
        <SideNavLabel>Upcoming Renewals</SideNavLabel>
      </SideNavItem>
      {/* <Divider />
      <SideNavItem>
        <SideNavIcon>
          <GoPerson />
        </SideNavIcon>
        <SideNavLabel>Sales Agents</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <MdDomain />
        </SideNavIcon>
        <SideNavLabel>Sales Offices</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoGlobe />
        </SideNavIcon>
        <SideNavLabel>Sales Regions</SideNavLabel>
      </SideNavItem> */}
      <Divider />
      <SideNavItem
        className={selection === 'Event Actions' ? 'selected' : ''}
        onClick={() => onSelection('Event Actions')}
      >
        <SideNavIcon>
          <FaBolt />
        </SideNavIcon>
        <SideNavLabel>Event Actions</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoGear />
        </SideNavIcon>
        <SideNavLabel>Settings</SideNavLabel>
      </SideNavItem>
      <SideNavItem>
        <SideNavIcon>
          <GoTools />
        </SideNavIcon>
        <SideNavLabel>Tools</SideNavLabel>
      </SideNavItem>
    </Container>
  );
}
