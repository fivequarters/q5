import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import ReactGA from 'react-ga';
import ScrollMemory from 'react-router-scroll-memory';
import { Body } from '@5qtrs/body';
import { FusebitModal, FusebitModalPage } from '@5qtrs/fusebit-modal';
import { BrowserRouter, Switch } from '@5qtrs/fusebit-link';
import { FusebitAppLoad } from '@5qtrs/fusebit-load';
import { FusebitNavBar } from '@5qtrs/fusebit-nav-bar';
import { FusebitFooter } from '@5qtrs/fusebit-footer';
import { fusebitFonts } from '@5qtrs/fusebit-text';
import '@5qtrs/fusebit-favicon';

import { Home, About, Support, Legal, Blog, Privacy, Terms, Route } from './page';

const App = () => {
  const [ready, setReady] = useState(true);
  const [modalPage, setModalPage] = useState(FusebitModalPage.ContactUs);
  const [modalShow, setModalShow] = useState(false);
  const [modalGaLabel, setModalGaLabel] = useState('');
  const [email, setEmail] = useState('');
  const [contactUs, setContactUs] = useState<{ contact: Boolean; returnUrl?: string } | undefined>(undefined);

  function onReady() {
    setReady(true);
  }

  function onModalClose() {
    if (contactUs && contactUs.returnUrl) {
      window.location.href = contactUs.returnUrl;
    } else {
      setEmail('');
      setModalGaLabel('');
      setModalShow(false);
    }
  }

  function onLetsTalkClicked() {
    setModalPage(FusebitModalPage.ContactUs);
    setModalGaLabel('Nav Bar');
    setModalShow(true);
  }

  function onEmailSubmit(email: string) {
    setEmail(email);
    setModalPage(FusebitModalPage.ContactUsAboutYou);
    setModalGaLabel('Solution');
    setModalShow(true);
  }

  function renderHome() {
    return <Home onEmailSubmit={onEmailSubmit} />;
  }

  React.useEffect(() => {
    if (contactUs === undefined) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      setContactUs({
        contact: params.get('contact') !== null,
        returnUrl: params.get('returnUrl') || undefined,
      });
    } else if (contactUs.contact) {
      setContactUs({ ...contactUs, contact: false });
      onLetsTalkClicked();
    }
  });

  return (
    <Body fonts={[fusebitFonts]} onReady={onReady}>
      <FusebitAppLoad show={!ready} />
      <FusebitModal
        modalPage={modalPage}
        email={email}
        show={modalShow}
        onClose={onModalClose}
        gaLabel={modalGaLabel}
      />
      <BrowserRouter basename="/">
        <ScrollMemory />
        <FusebitNavBar onLetsTalkClicked={onLetsTalkClicked} />
        <Switch>
          <Route path="/" exact render={renderHome} />
          {/* <Route path="/docs" component={Docs} /> */}
          <Route path="/about" component={About} />
          <Route path="/blog" exact component={Blog} />
          <Route path="/blog/:year?/:month?/:day?/:postId?" component={Blog} />
          <Route path="/legal" component={Legal} />
          <Route path="/support" component={Support} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route
            path="/downloads"
            component={() => {
              window.location.href = 'https://fivequarters.github.io/q5/downloads/';
              return null;
            }}
          />
        </Switch>
        <FusebitFooter />
      </BrowserRouter>
    </Body>
  );
};

ReactGA.initialize('UA-136792777-1');
ReactGA.pageview(window.location.pathname + window.location.search);
ReactDOM.render(<App />, document.getElementById('app'));
