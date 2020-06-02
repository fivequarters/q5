import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { BrowserRouter } from '@5qtrs/fusebit-link';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitLogoLink, FusebitNavLink, FusebitNavLinkType } from './index';

const App = () => (
  <BrowserRouter>
    <Box vertical>
      <Box gap={20}>
        <FusebitLogoLink />
        <FusebitLogoLink markColor={FusebitColor.black} />
        <FusebitLogoLink size={100} />
      </Box>

      <Box gap={20}>
        <FusebitNavLink linkType={FusebitNavLinkType.about} />
        <FusebitNavLink linkType={FusebitNavLinkType.blog} />
        <FusebitNavLink linkType={FusebitNavLinkType.docs} />
      </Box>

      <Box gap={20}>
        <FusebitNavLink noIcon linkType={FusebitNavLinkType.about} />
        <FusebitNavLink noIcon linkType={FusebitNavLinkType.blog} />
        <FusebitNavLink noIcon linkType={FusebitNavLinkType.docs} />
      </Box>

      <Box gap={20} background={FusebitColor.black}>
        <FusebitNavLink color={FusebitColor.white} linkType={FusebitNavLinkType.about} />
        <FusebitNavLink color={FusebitColor.white} linkType={FusebitNavLinkType.blog} />
        <FusebitNavLink color={FusebitColor.white} linkType={FusebitNavLinkType.docs} />
      </Box>

      <Box gap={20} background={FusebitColor.black}>
        <FusebitNavLink noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.about} />
        <FusebitNavLink noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.blog} />
        <FusebitNavLink noIcon color={FusebitColor.white} linkType={FusebitNavLinkType.docs} />
      </Box>

      <Box gap={20}>
        <FusebitNavLink noHover linkType={FusebitNavLinkType.about} />
        <FusebitNavLink noHover linkType={FusebitNavLinkType.blog} />
        <FusebitNavLink noHover linkType={FusebitNavLinkType.docs} />
      </Box>

      <Box gap={20} background={FusebitColor.black}>
        <FusebitNavLink linkType={FusebitNavLinkType.terms} />
        <FusebitNavLink linkType={FusebitNavLinkType.privacy} />
        <FusebitNavLink linkType={FusebitNavLinkType.copyRight} />
      </Box>
    </Box>
  </BrowserRouter>
);

ReactDOM.render(<App />, document.getElementById('app'));
