import { IoIosAddCircleOutline } from '@5qtrs/icon';
import { request } from '@5qtrs/request';
import React, { useState } from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Section } from './Section';
import ReactGA from 'react-ga';

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

const StyledSection = styled(Section)`
  ${props => applyTheme(props, 'footerCta')}
`;

const InnerContainer = styled.div`
  flex: 1;
  display: flex;
`;

const Column = styled.div`
  flex: 1;
  text-align: center;
`;

const Message = styled.h3`
  max-width: 600px;
  margin: 0 auto 30px auto;
  line-height: 2;
  ${props => applyTheme(props, 'footerCta', 'message')}
`;

const PlusIcon = styled(IoIosAddCircleOutline)`
  &.enabled {
    cursor: pointer;
  }
  ${props => applyTheme(props, 'footerCta', 'button')}
`;

const Input = styled.input`
  width: 210px;
  outline: none;
  margin-right: 10px;
  border: 0px;
  border-bottom: 1px dotted #34495e;
  ${props => applyTheme(props, 'footerCta', 'input')}
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmailSent = styled.h3`
  font-size: 20px;
  margin-top: 20px;
  margin-bottom: 0;
  ${props => applyTheme(props, 'footerCta', 'sent')}
`;

export function FooterCTA() {
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
      ReactGA.event({
        category: 'CTA',
        action: 'Form Fill',
        label: 'Bottom Banner - Learn More',
      });
      setTimeout(async () => {
        setShowEmailMessage(false);
      }, displayEmailSentInterval);
    }
  }

  return (
    <StyledSection>
      <Column>
        <Message>Want to learn more? Interested in trying out Fusebit?</Message>
        <Form>
          <Input type="text" placeholder="Enter your email" value={email} onChange={onEmailChange} />
          <PlusIcon className={validEmail ? 'enabled' : ''} onClick={onButtonClicked} />
        </Form>
        <EmailSent style={{ visibility: showEmailMessage ? undefined : 'hidden' }}>
          Thanks, we'll keep you updated!
        </EmailSent>
      </Column>
    </StyledSection>
  );
}
