import { Body } from '@5qtrs/body';
import '@5qtrs/corp-favicon';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AppLoading, Footer, NavBar, Splash, Features, VP, Problem, FooterCTA, AboutUs } from './comp';
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
      <Problem />
      <Features />
      <VP />
      <FooterCTA/>
      <AboutUs />
      <Footer />
    </Body>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
