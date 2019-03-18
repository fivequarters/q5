import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ApiContext } from './ApiContext';
import { EventActions } from './EventActions';
import { Addons } from './Addons';
import { Inquiries } from './Inquiries';
import { MainContent } from './MainContent';
import { NavBar } from './NavBar';
import { Notifications } from './Notifications';
import { SideNav } from './SideNav';

enum Selections {
  newInquiries = 'Leads',
  eventActions = 'Event Actions',
  addons = 'Addons',
}

export const Content = styled.div`
  height: calc(100% - 90px);
  width: 100%;
  display: flex;
  font-size: 14px;
  color: white;
  font-family: 'Roboto', san-serif;
  background-color: #f7f9f9;
`;

export function Main() {
  const [selection, setSelection] = useState(Selections.newInquiries as string);
  const [inquiries, setInquiries] = useState([]);
  const api = useContext(ApiContext);

  async function pollForInquiries() {
    const data = await api.getInquiries();
    if (data.length > inquiries.length) {
      setInquiries(data);
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', async event => {
      if (event.code === 'ShiftRight' && event.metaKey) {
        await api.generateInquiry();
      }
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      return pollForInquiries();
    }, 500);
    return () => {
      clearInterval(timer);
    };
  }, [inquiries]);

  const display = [
    selection === Selections.newInquiries ? '' : 'none',
    selection === Selections.eventActions ? '' : 'none',
    selection === Selections.addons ? '' : 'none',
  ];

  return (
    <>
      <NavBar />
      <Content>
        <SideNav selection={selection} onSelection={setSelection} />
        <MainContent heading={selection}>
          <Inquiries inquiries={inquiries} style={{ display: display[0] }} />
          <EventActions style={{ display: display[1] }} />
          <Addons style={{ display: display[2] }} />
        </MainContent>
        <Notifications inquiries={inquiries} />
      </Content>
    </>
  );
}
