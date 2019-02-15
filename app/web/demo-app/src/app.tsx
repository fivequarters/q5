import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Body } from '@5qtrs/body';
import { NavBar, Content, SideNav, Main, Notifications, Inquiries, EventActions } from './comp';
import { getInquiries } from './data';

const fonts = ['Raleway:400,300,200', 'Roboto:400,500', 'Staatliches:400'];

const App = () => {
  const [selection, setSelection] = useState('New Inquiries');
  const inquiries = getInquiries();

  const display = [selection === 'New Inquiries' ? '' : 'none', selection === 'Event Actions' ? '' : 'none'];

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
