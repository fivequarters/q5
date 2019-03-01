import { FaBolt, GoAlert, GoCheck, GoClock, GoGear, GoInbox, GoQuote, GoTools } from '@5qtrs/icon';
import React from 'react';
import styled from 'styled-components';

// ------------------
// Internal Constants
// ------------------

const sideNavItems = [
  { name: 'New Inquiries', icon: GoInbox, canSelect: true },
  { name: 'Qualified Leads', icon: GoCheck, canSelect: false },
  { name: 'Contract Negotiations', icon: GoQuote, canSelect: false },
  { name: 'Upcoming Renewals', icon: GoClock, canSelect: false },
  { name: 'divider', icon: GoAlert, canSelect: false },
  { name: 'Event Actions', icon: FaBolt, canSelect: true },
  { name: 'Settings', icon: GoGear, canSelect: false },
  { name: 'Tools', icon: GoTools, canSelect: false },
];

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #34495e;
  padding: 20px;
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
  const items = sideNavItems.map(sideNavItem => {
    function onClick() {
      if (sideNavItem.canSelect) {
        return onSelection(sideNavItem.name);
      }
    }
    return sideNavItem.name === 'divider' ? (
      <Divider key={'divider'} />
    ) : (
      <SideNavItem
        key={sideNavItem.name}
        className={selection === sideNavItem.name ? 'selected' : ''}
        onClick={onClick}
      >
        <SideNavIcon>{React.createElement(sideNavItem.icon)}</SideNavIcon>
        <SideNavLabel>{sideNavItem.name}</SideNavLabel>
      </SideNavItem>
    );
  });

  return <Container>{items}</Container>;
}
