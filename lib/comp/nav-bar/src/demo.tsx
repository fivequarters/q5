import { Body } from '@5qtrs/body';
import React from 'react';
import ReactDOM from 'react-dom';
import { NavBar, NavBarSpacer } from './NavBar';

const App = () => (
  <Body>
    <NavBar sticky style={{ padding: 20 }}>
      <div> ICON </div>
      <div style={{ marginLeft: 20 }}> CompanyName </div>
      <NavBarSpacer />
      CENTER
      <NavBarSpacer />
      <div>Right 1</div>
      <div style={{ marginLeft: 20 }}>Right 2</div>
    </NavBar>

    <div style={{ width: '100%', height: 5000 }} />
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
