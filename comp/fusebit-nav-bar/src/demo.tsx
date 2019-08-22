import React from 'react';
import ReactDOM from 'react-dom';
import { Body } from '@5qtrs/body';
import { FusebitNavBar } from './index';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { BrowserRouter } from '@5qtrs/fusebit-link';

const App = () => (
  <Body height={2000} background={FusebitColor.light} fonts={['Nunito Sans:400,600,700', 'Poppins:400,600,700']}>
    <BrowserRouter>
      <FusebitNavBar />
    </BrowserRouter>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
