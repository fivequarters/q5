import React, { useState } from 'react';
import styled from 'styled-components';
import { Fade } from '@5qtrs/fade';
import { Modal } from '@5qtrs/modal';
import { CorpLogoDynamic } from '@5qtrs/corp-logo-dynamic';

const StyledModal = styled(Modal)`
  background-color: white;
`;

export type AppLoadingProps = {
  visible?: boolean;
};

export function AppLoading({ visible }: AppLoadingProps) {
  const [innerVisible, setInnerVisible] = useState(true);

  return (
    <Fade visible={visible} fadeOut onFadeOut={() => setInnerVisible(false)}>
      <StyledModal visible={innerVisible}>
        <Fade visible={visible} fadeIn fadeOut>
          <CorpLogoDynamic size={100} rate={5} visible={innerVisible} />
        </Fade>
      </StyledModal>
    </Fade>
  );
}
