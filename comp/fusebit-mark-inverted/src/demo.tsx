import React from 'react';
import ReactDOM from 'react-dom';
import { FusebitMarkInverted } from './FusebitMarkInverted';
import { Box } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <>
    <Box>
      <FusebitMarkInverted margin={20} />
      <FusebitMarkInverted size={75} margin={20} color={FusebitColor.cyan} />
      <FusebitMarkInverted size={100} margin={20} color={FusebitColor.orange} />
      <FusebitMarkInverted size={150} margin={20} color={FusebitColor.dark} />
      <FusebitMarkInverted expand />
    </Box>
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
