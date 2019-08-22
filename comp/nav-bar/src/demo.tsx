import React from 'react';
import ReactDOM from 'react-dom';
import { Body } from '@5qtrs/body';
import { Box } from '@5qtrs/box';
import { NavBar } from './NavBar';

const App = () => (
  <Body background="red" color="white">
    <NavBar middle gap={20} background="blue">
      <Box middle width={50} height={50}>
        ICON
      </Box>
      <Box>CompanyName</Box>
      <Box expand />
      <Box>Right 1</Box>
      <Box>Right 2</Box>
    </NavBar>

    <Box padding={20} width="100%" height={5000}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras sed metus sem. Morbi a convallis arcu. Duis commodo
      lacus id ex egestas, a volutpat metus dignissim. Praesent efficitur ornare diam, ut ultrices purus pretium id.
      Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Sed ultrices molestie felis
      in mattis. Phasellus eu ligula nibh. Suspendisse sit amet felis tincidunt, sollicitudin risus sed, ullamcorper
      lacus. Praesent ornare augue in erat sagittis fermentum. Ut metus nisi, feugiat consequat vulputate vel, commodo
      id mauris. Mauris non nulla sit amet nunc commodo vestibulum suscipit in mi. Donec porttitor elementum mi. Nam ac
      tellus at nibh euismod consequat. Integer vestibulum ac eros in auctor. Suspendisse sed sem vel orci ornare
      suscipit in suscipit sapien. Aliquam congue sem vel ipsum porta, vel interdum libero cursus. Donec in porttitor
      arcu, ac mollis diam. Suspendisse consectetur nisl quam, ut commodo lorem suscipit a. Proin purus ante, tristique
      nec pretium in, hendrerit eget est. Pellentesque ac nisl nunc. Nulla tincidunt luctus rutrum. Mauris aliquet,
      augue ac sagittis porttitor, urna lorem scelerisque odio, in vestibulum risus magna at eros. Proin erat augue,
      ultricies nec velit a, convallis consequat tellus. In lacinia libero in erat commodo auctor.
    </Box>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
