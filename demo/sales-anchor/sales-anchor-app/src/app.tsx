import { Body } from '@5qtrs/body';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Api } from './api';
import { ApiProvider, Login, Main } from './comp';

const fonts = ['Raleway:400,300,200', 'Roboto:300,400,500'];
const api = new Api({
  salesAnchorApiUrl: 'http://localhost:4001',
  googleOptions: {
    clientId: '888229154378-8851vanmq57lq92ejui12tes3g6ddlck.apps.googleusercontent.com',
  },
  auth0Options: {
    clientId: 'capJtRDfcjCqM7qHrmOycVHoAP5IpXJX',
    salesAnchorDomain: 'sales-anchor.auth0.com',
    salesAnchorAudience: 'sales-anchor.com',
    fiveQuartersAudience: 'auth.fivequarters.io',
    redirectUri: 'http://localhost:4002',
  },
});

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  function onLogin() {
    setLoggedIn(true);
  }

  return (
    <Body fonts={fonts}>
      <ApiProvider api={api}>{loggedIn ? <Main /> : <Login onLogin={onLogin} />}</ApiProvider>
    </Body>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
