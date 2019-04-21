import { Body } from '@5qtrs/body';
import '@5qtrs/corp-favicon';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AboutUs, AppLoading, EmailForm, Footer, NavBar, Products, Splash } from './comp';
import { theme } from './theme';

const App = () => {
  const [loading, setLoading] = useState(true);

  function onReady() {
    setLoading(false);
  }

  return (
    <Body theme={theme} onReady={onReady}>
      <AppLoading visible={loading} logoDisplayDelay={500} />
      <NavBar />
      <Splash />
      <EmailForm />
      <Products />
      <AboutUs />
      <Footer />
    </Body>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
