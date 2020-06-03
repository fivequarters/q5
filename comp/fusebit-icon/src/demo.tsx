import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import {
  AboutUsIcon,
  BlogIcon,
  DocsIcon,
  CloseNavIcon,
  OpenNavIcon,
  PuzzleIcon,
  EmptyTagIcon,
  ShieldIcon,
  NetworkFileIcon,
  FourBoxesIcon,
  OrgChartIcon,
  QuoteIcon,
  TwitterIcon,
  LinkedInIcon,
  AccoladeOneIcon,
  AccoladeTwoIcon,
  AccoladeThreeIcon,
} from './index';
import { FusebitColor } from '@5qtrs/fusebit-color';

const App = () => (
  <>
    <Box vertical>
      Nav Bar Icons
      <Box gap={15}>
        <AboutUsIcon margin={15} />
        <BlogIcon margin={15} />
        <DocsIcon margin={15} />
      </Box>
      Mobile Nav Bar Icons
      <Box gap={15}>
        <CloseNavIcon margin={15} />
        <OpenNavIcon margin={15} />
      </Box>
      Solution Icons
      <Box gap={15}>
        <PuzzleIcon margin={15} />
        <EmptyTagIcon margin={15} />
        <ShieldIcon margin={15} />
        <NetworkFileIcon margin={15} />
        <FourBoxesIcon margin={15} />
        <OrgChartIcon margin={15} />
      </Box>
      Misc Icons
      <Box gap={15}>
        <QuoteIcon margin={15} />
        <TwitterIcon margin={15} />
        <LinkedInIcon margin={15} />
        <AccoladeOneIcon margin={15} />
        <AccoladeTwoIcon margin={15} />
        <AccoladeThreeIcon margin={15} />
      </Box>
      Layout (icon should size based on parent)
      <Box width={100} height={100} margin={10} background={FusebitColor.black}>
        <AboutUsIcon expand margin={15} color={FusebitColor.white} />
      </Box>
    </Box>
    <Box />
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
