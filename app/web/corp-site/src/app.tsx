import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { AppLoading, NavBar, Splash, EmailForm, AboutUs, Footer } from './comp';
import { Body } from '@5qtrs/body';
import { theme } from './theme';

const App = () => {
  const [loading, setLoading] = useState(true);

  return (
    <Body theme={theme} onReady={() => setLoading(false)}>
      <AppLoading visible={loading} />
      <NavBar />
      <Splash />
      <EmailForm />
      <AboutUs />
      <Footer />
    </Body>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
