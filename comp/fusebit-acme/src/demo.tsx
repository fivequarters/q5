import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitAcmeGraphic } from './index';

const App = () => (
  <Box vertical height={1000} margin={-20} padding={20} background="gray">
    <FusebitAcmeGraphic />
    <Box height={50} />
    <FusebitAcmeGraphic size={200} />
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
