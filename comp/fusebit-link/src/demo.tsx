import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitText } from '@5qtrs/fusebit-text';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitLink, BrowserRouter } from './index';

const App = () => {
  return (
    <BrowserRouter>
      <Box vertical>
        <FusebitText>
          <Box gap={20}>
            <Box>
              <FusebitLink to="/page1" noVisit>
                Routed Link - Not Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="/docs" color={FusebitColor.cyan} noVisit>
                Relative Link - Not Visited
              </FusebitLink>
            </Box>
            <Box>
              <FusebitLink href="http://www.google.com" color={FusebitColor.orange} noVisit>
                Outbound Link - Not Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink color={FusebitColor.black} noVisit>
                Empty Link - Not Visited
              </FusebitLink>
            </Box>
          </Box>
        </FusebitText>

        <FusebitText>
          <Box gap={20} background={FusebitColor.black}>
            <Box>
              <FusebitLink to="/page2" noVisit>
                Routed Link - Not Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="/docs" color={FusebitColor.cyan} noVisit>
                Relative Link - Not Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="http://www.google.com" color={FusebitColor.orange} noVisit>
                Outbound Link - Not Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink color={FusebitColor.lightBlue} noVisit>
                Empty Link - Not Visited
              </FusebitLink>
            </Box>
          </Box>
        </FusebitText>

        <FusebitText>
          <Box gap={20}>
            <Box>
              <FusebitLink to="/page1">Routed Link - Visited</FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="/docs" color={FusebitColor.cyan}>
                Relative Link - Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="http://www.google.com" color={FusebitColor.orange}>
                Outbound Link - Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink color={FusebitColor.black}>Empty Link - Visited</FusebitLink>
            </Box>
          </Box>
        </FusebitText>

        <FusebitText>
          <Box gap={20} background={FusebitColor.black}>
            <Box>
              <FusebitLink to="/page2">Routed Link - Visited</FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="/docs" color={FusebitColor.cyan}>
                Relative Link - Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink href="http://www.google.com" color={FusebitColor.orange}>
                Outbound Link - Visited
              </FusebitLink>
            </Box>

            <Box>
              <FusebitLink color={FusebitColor.lightBlue}>Empty Link - Visited</FusebitLink>
            </Box>
          </Box>
        </FusebitText>

        <Box margin={20}>
          <FusebitText>
            Lorem ipsum dolor sit amet, <FusebitLink to="/link">consectetur</FusebitLink> adipiscing elit. Suspendisse
            laoreet urna in arcu consectetur, at pellentesque nunc mollis. Vestibulum pellentesque ex sed urna rhoncus,
            a eleifend diam scelerisque. Fusce convallis lobortis hendrerit. Vivamus consectetur ipsum metus, sed
            tincidunt lorem ultricies ut. Donec porta tristique nulla, nec scelerisque quam vehicula in. Maecenas
            maximus ligula in facilisis tempus. Morbi euismod, metus eu placerat pellentesque, tortor est cursus ipsum,
            eget consectetur tortor elit sit amet lacus. Aliquam lobortis turpis vitae metus maximus, id posuere quam
            ullamcorper. Maecenas tortor nibh, rutrum id ultricies eget, vehicula id mauris. Sed quis maximus turpis,
            sit amet convallis ligula. Ut porta velit eget neque malesuada tempor. Nam in libero sagittis, ullamcorper
            urna lobortis, luctus libero. Morbi nisl dui, auctor vel est ut, rhoncus interdum tortor.
          </FusebitText>
        </Box>
      </Box>
    </BrowserRouter>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
