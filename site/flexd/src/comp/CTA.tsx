import { IoIosAddCircleOutline } from '@5qtrs/icon';
import { request } from '@5qtrs/request';
import React, { useState } from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Text } from './Text';

// ------------------
// Internal Constants
// ------------------

const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i; // tslint:disable-line
const googleSheetUrl =
  'https://script.google.com/macros/s/AKfycbwvCP7_RW163ccBtVR5T6WRwkCHPE-3NO-D7-lyoG5Ce1DB9lc/exec';
const displayEmailSentInterval = 10000;

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  flex: 1;
  display: flex;
  max-width: 370px;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
  justify-content: flex-start;
  padding: 30px;
  ${props => applyTheme(props, 'splash', 'cta')}
`;

const InnerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
`;

const Column = styled.div`
  flex: 1;
  text-align: center;
`;

const Message = styled.div`
  max-width: 250px;
  margin: auto;
  margin-bottom: 30px;
  line-height: 2;
  ${props => applyTheme(props, 'splash', 'cta', 'message')}
`;

const PlusIcon = styled(IoIosAddCircleOutline)`
  &.enabled {
    cursor: pointer;
  }
  ${props => applyTheme(props, 'splash', 'cta', 'button')}
`;

const Input = styled.input`
  width: 210px;
  outline: none;
  margin-right: 10px;
  border: 0px;
  border-bottom: 1px dotted white;
  ${props => applyTheme(props, 'splash', 'cta', 'input')}
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmailSent = styled.div`
  font-size: 20px;
  margin-top: 20px;
  ${props => applyTheme(props, 'splash', 'cta', 'sent')}
`;

export function CTA() {
  const [email, setEmail] = useState('');
  const [validEmail, setValidEmail] = useState(false);
  const [showEmailMessage, setShowEmailMessage] = useState(false);

  function onEmailChange(event: any) {
    const emailValue = event.target.value;
    setEmail(emailValue);
    setValidEmail(emailRegex.test(emailValue));
  }

  async function onButtonClicked(event: any) {
    if (validEmail) {
      setShowEmailMessage(true);
      await request({
        method: 'POST',
        url: `${googleSheetUrl}?Email=${email}`,
      });
      setTimeout(async () => {
        setShowEmailMessage(false);
      }, displayEmailSentInterval);
    }
  }

  return (
    <Container>
      <InnerContainer>
        <Column>
          <Message>
            <Text content="Want to learn more?" />
          </Message>
          <Form>
            <Input type="text" placeholder="Enter your email" value={email} onChange={onEmailChange} />
            <PlusIcon className={validEmail ? 'enabled' : ''} onClick={onButtonClicked} />
          </Form>
          <EmailSent style={{ visibility: showEmailMessage ? undefined : 'hidden' }}>
            <Text content="Thanks, we'll keep you updated!" />
          </EmailSent>
        </Column>
      </InnerContainer>
    </Container>
  );
}
