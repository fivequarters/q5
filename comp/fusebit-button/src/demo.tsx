import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitButton } from './FusebitButton';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <Box vertical>
    <Box gap={20}>
      <FusebitButton>Hello</FusebitButton>

      <FusebitButton outline={true}>Hello</FusebitButton>

      <FusebitButton color={FusebitColor.dark}>Hello</FusebitButton>
      <FusebitButton color={FusebitColor.cyan}>Hello</FusebitButton>
    </Box>

    <Box gap={20}>
      <FusebitButton small={true}>Small</FusebitButton>

      <FusebitButton small={true} outline={true} color={FusebitColor.dark}>
        Small
      </FusebitButton>

      <FusebitButton small={true} color={FusebitColor.dark}>
        Small
      </FusebitButton>

      <FusebitButton small={true} color={FusebitColor.cyan}>
        Small
      </FusebitButton>
    </Box>

    <Box width={300} gap={20}>
      <FusebitButton expand small={true} color={FusebitColor.dark}>
        Sized by Parent
      </FusebitButton>
    </Box>

    <Box gap={20}>
      <FusebitButton href="http://www.google.com">Link Button</FusebitButton>
    </Box>

    <Box gap={20}>
      <FusebitButton disabled>Disabled</FusebitButton>
    </Box>

    <Box gap={20}>
      <FusebitButton noFocus>No Focus</FusebitButton>
    </Box>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
