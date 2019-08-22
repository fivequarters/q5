import React from 'react';
import ReactDOM from 'react-dom';
import { FusebitFooter } from './FusebitFooter';
import { BrowserRouter } from '@5qtrs/fusebit-link';
import { Body } from '@5qtrs/body';

const App = () => (
  <Body fonts={['Nunito Sans:400,700', 'Poppins:400,600']}>
    <BrowserRouter>
      <FusebitFooter />
    </BrowserRouter>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
