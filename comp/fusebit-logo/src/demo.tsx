import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitLogo } from './FusebitLogo';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <Box>
    <FusebitLogo margin={15} />
    <Box margin={15} padding={25} background={FusebitColor.dark} style={{ borderRadius: 10 }}>
      <FusebitLogo size={50} markColor={FusebitColor.light} />
    </Box>
    <Box margin={15} padding={25} background={FusebitColor.light} style={{ borderRadius: 10 }}>
      <FusebitLogo size={50} markColor={FusebitColor.dark} />
    </Box>
    <Box margin={15} padding={25} background={FusebitColor.light} style={{ width: '20%', borderRadius: 10 }}>
      <FusebitLogo expand markColor={FusebitColor.red} nameColor={FusebitColor.red} markAbove />
    </Box>
    <FusebitLogo size={200} margin={15} />
    <FusebitLogo size={75} margin={15} markAbove markColor={FusebitColor.cyan} />
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
