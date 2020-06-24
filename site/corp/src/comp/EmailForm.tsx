import { IoIosAddCircleOutline } from '@5qtrs/icon';
import { request } from '@5qtrs/request';
import React, { useState } from 'react';
import styled from 'styled-components';
import { content } from '../content';
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
  padding-top: 60px;
  ${(props) => applyTheme(props, 'email')}
`;

const Gutter = styled.div`
  min-width: 20px;
  @media only screen and (min-width: 600px) {
    min-width: 100px;
  }
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
  min-width: 400px;
  margin-bottom: 50px;
`;

const Message = styled.div`
  max-width: 400px;
  margin: auto;
  margin-bottom: 30px;
  line-height: 2;
  ${(props) => applyTheme(props, 'email', 'message')}
`;

const PlusIcon = styled(IoIosAddCircleOutline)`
  &.enabled {
    cursor: pointer;
  }
  ${(props) => applyTheme(props, 'email', 'button')}
`;

const Input = styled.input`
  width: 250px;
  outline: none;
  margin-right: 10px;
  border: 0px;
  border-bottom: 1px dotted white;
  ${(props) => applyTheme(props, 'email', 'input')}
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmailSent = styled.div`
  font-size: 20px;
  margin-top: 20px;
  ${(props) => applyTheme(props, 'email', 'sent')}
`;

export function EmailForm() {
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
      <Gutter />
      <InnerContainer>
        <Column>
          <Message>
            <Text content={content.emailForm.message || ''} />
          </Message>
          <Form>
            <Input
              type="text"
              placeholder={content.emailForm.inputPlaceholder}
              value={email}
              onChange={onEmailChange}
            />
            <PlusIcon className={validEmail ? 'enabled' : ''} onClick={onButtonClicked} />
          </Form>
          <EmailSent style={{ visibility: showEmailMessage ? undefined : 'hidden' }}>
            <Text content={content.emailForm.emailSent || ''} />
          </EmailSent>
        </Column>
      </InnerContainer>
      <Gutter />
    </Container>
  );
}
