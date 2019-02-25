import { Body } from '@5qtrs/body';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Content, EventActions, Inquiries, Main, NavBar, Notifications, SideNav } from './comp';
import { getInquiries } from './data';

const fonts = ['Raleway:400,300,200', 'Roboto:300,400,500'];
const saasBaseUrl = 'http://localhost:4001';

enum Selections {
  newInquiries = 'New Inquiries',
  eventActions = 'Event Actions',
}

const App = () => {
  const [selection, setSelection] = useState(Selections.newInquiries as string);
  const inquiries = getInquiries(saasBaseUrl);

  const display = [
    selection === Selections.newInquiries ? '' : 'none',
    selection === Selections.eventActions ? '' : 'none',
  ];

  return (
    <Body fonts={fonts}>
      <NavBar />
      <Content>
        <SideNav selection={selection} onSelection={setSelection} />
        <Main heading={selection}>
          <Inquiries data={inquiries} style={{ display: display[0] }} />
          <EventActions style={{ display: display[1] }} />
        </Main>
        <Notifications data={inquiries} />
      </Content>
    </Body>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
