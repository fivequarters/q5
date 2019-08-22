import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitSocialButton, FusebitSocialType } from './index';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <Box vertical>
    <Box gap={15}>
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" />
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" invertColor />
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" noOutline />
    </Box>
    <Box gap={15}>
      <FusebitSocialButton
        type={FusebitSocialType.twitter}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
      />
      <FusebitSocialButton
        type={FusebitSocialType.twitter}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
        invertColor
      />
      <FusebitSocialButton
        type={FusebitSocialType.twitter}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
        noOutline
      />
    </Box>
    <Box gap={15}>
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" small />
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" small invertColor />
      <FusebitSocialButton type={FusebitSocialType.twitter} href="https://twitter.com/fusebitio" small noOutline />
    </Box>
    <Box gap={15}>
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" />
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" invertColor />
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" noOutline />
    </Box>
    <Box gap={15}>
      <FusebitSocialButton
        type={FusebitSocialType.linkedIn}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
      />
      <FusebitSocialButton
        type={FusebitSocialType.linkedIn}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
        invertColor
      />
      <FusebitSocialButton
        type={FusebitSocialType.linkedIn}
        href="https://twitter.com/fusebitio"
        color={FusebitColor.red}
        noOutline
      />
    </Box>
    <Box gap={15}>
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" small />
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" small invertColor />
      <FusebitSocialButton type={FusebitSocialType.linkedIn} href="https://twitter.com/fusebitio" small noOutline />
    </Box>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
