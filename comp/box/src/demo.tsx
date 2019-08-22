import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from './index';

const App = () => (
  <Box vertical gap={20}>
    Boxes with different alignments
    <Box width="100%" gap={20} background="yellow">
      <Box center middle width={150} stretch minHeight={150} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          middle center
        </Box>
      </Box>

      <Box middle width={150} stretch minHeight={150} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          middle
        </Box>
      </Box>

      <Box center width={320} height={320} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          center
        </Box>
      </Box>

      <Box right width={150} stretch minHeight={150} margin={30} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          right
        </Box>
      </Box>

      <Box bottom width={150} height={150} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          bottom
        </Box>
      </Box>

      <Box right bottom width={150} height={150} minHeight={150} background="blue">
        <Box center middle width={100} height={100} background="red" color="white">
          right bottom
        </Box>
      </Box>
    </Box>
    Boxes with Expand and Scroll
    <Box width="100%" background="blue" gap={20} scroll>
      <Box center middle width={100} height={100} background="red" color="white">
        item 1
      </Box>

      <Box center middle width={100} height={100} background="red" color="white">
        item 2
      </Box>

      <Box expand minWidth={300} />

      <Box center middle width={100} height={100} background="red" color="white">
        item 3
      </Box>
    </Box>
    Boxes with Stretch
    <Box width="100%" gap={20} background="yellow">
      <Box width={300} height={150} background="blue" padding={20}>
        <Box center middle stretch expand color="white" background="red">
          Stretch & Expand
        </Box>
      </Box>

      <Box minHeight={150} background="blue" expand gap={20}>
        <Box center middle width={150} color="white" background="red" padding={10}>
          Nothing
        </Box>

        <Box center middle width={150} stretch color="white" minHeight={50} background="red">
          Stretch
        </Box>

        <Box center middle expand stretch color="white" minWidth={200} minHeight={50} background="red">
          Stretch & Expand
        </Box>
      </Box>
    </Box>
    Box with NoWrap
    <Box middle noWrap width={150} height={150} background="blue">
      <Box center middle width={100} height={100} background="red" color="white">
        item 1
      </Box>
      <Box center middle width={100} height={100} background="red" color="white">
        item 2
      </Box>
    </Box>
    Vertical Box
    <Box vertical center width={150} background="blue" gap={20}>
      <Box center middle width={100} height={100} background="red" color="white">
        item 1
      </Box>

      <Box center middle width={100} height={100} background="red" color="white">
        item 2
      </Box>
    </Box>
    Vertical Box with Stretch & Expand
    <Box vertical width={200} height={300} gap={20} background="blue">
      <Box center middle padding={20} stretch background="red" color="white">
        item 1
      </Box>
      <Box center middle padding={20} expand background="red" color="white">
        item 2
      </Box>
    </Box>
    <Box vertical center width={150} background="blue">
      <Box center middle width={100} height={100} background="red" color="white">
        item 1
      </Box>

      <Box center middle width={100} height={100} background="red" color="white">
        item 2
      </Box>
    </Box>
    <Box vertical gap={20} background="blue">
      <Box center middle height={100} padding={20} background="red" color="white">
        item 1
      </Box>
      <Box center padding={20} background="red" color="white">
        item 2
      </Box>
    </Box>
    Overlay Box
    <Box overlay right width={300} height={300} background="blue">
      <Box center middle width={100} height={100} background="red" color="white">
        item 1
      </Box>

      <Box vertical>
        <Box height={150} />
        <Box center middle width={50} height={50} background="red" color="white">
          item 2
        </Box>
      </Box>
    </Box>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
