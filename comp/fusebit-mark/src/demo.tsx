import React from 'react';
import ReactDOM from 'react-dom';
import { FusebitMark } from './FusebitMark';
import { Box } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <Box>
    <FusebitMark margin={20} />
    <FusebitMark size={75} margin={20} color={FusebitColor.cyan} />
    <FusebitMark size={100} margin={20} color={FusebitColor.orange} />
    <FusebitMark size={150} margin={20} color={FusebitColor.black} />
    <FusebitMark expand />
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
