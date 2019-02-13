import React, { useState } from 'react';
import styled from 'styled-components';
import { Section } from './Section';

// ------------------
// Internal Constants
// ------------------

const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

// --------------
// Internal Types
// --------------

type PlusButtonProps = {
  stroke?: string;
  strokeWidth?: number;
  size?: number;
  fill?: string;
  enabled?: boolean;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Internal Components
// -------------------

const Content = styled.div`
  margin: 50px 10%;
  @media only screen and (min-width: 800px) {
    margin: 50px 25%;
  }
  color: black;
  font-size: 30px;
  text-align: justify;
  font-family: 'Josefin Sans', sans-serif;
  font-variant: initial;
`;

const Input = styled.input`
  font-size: 30px;
  width: 400px;
  margin: 10px;
  font-family: 'Josefin Sans', sans-serif;
  border: 0px;
  background: transparent;
  border-bottom: 1px solid #d5d8dc;
  outline: none;
  &::placeholder {
    color: #d5d8dc;
  }
`;

const Button = styled.div`
  display: inline-block;
  & svg {
    fill: transparent;
    stroke: #d5d8dc;
  }
  &.enabled:hover svg {
    stroke: #fc4445;
  }
  &.enabled svg {
    stroke: black;
    cursor: pointer;
  }
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmailSent = styled.div`
  font-size: 20px;
  margin-top: 20px;
  text-align: center;
  font-family: 'Josefin Sans', sans-serif;
  font-variant: initial;
`;

function PlusButton({ stroke, strokeWidth, size, enabled, fill, className, ...rest }: PlusButtonProps) {
  size = size || 40;
  strokeWidth = strokeWidth || 5;
  className = className + (enabled ? ' enabled' : '');

  return (
    <Button {...rest} className={className}>
      <svg width={size} height={size} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={50} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <line x1={20} y1={55} x2={90} y2={55} stroke={stroke} strokeWidth={strokeWidth} />
        <line x1={55} y1={20} x2={55} y2={90} stroke={stroke} strokeWidth={strokeWidth} />
      </svg>
    </Button>
  );
}

export function AppProducts() {
  const [email, setEmail] = useState('');
  const [validEmail, setValidEmail] = useState(false);
  const [showEmailMessage, setShowEmailMessage] = useState(false);

  function onEmailChange(event: any) {
    const email = event.target.value;
    setEmail(email);
    setValidEmail(emailRegex.test(email));
  }

  function onButtonClicked(event: any) {
    setShowEmailMessage(true);
    setTimeout(() => {
      setShowEmailMessage(false);
    }, 10000);
  }

  return (
    <Section id="products" title="Products">
      <Content>We're furiously building our first product to make SaaS integrations just work better.</Content>
      <Content>Want to be notified when it's available for limited preview?</Content>
      <Form>
        <Input type="text" placeholder="Email" value={email} onChange={onEmailChange} />
        <PlusButton enabled={validEmail} onClick={onButtonClicked} />
      </Form>
      <EmailSent style={{ opacity: showEmailMessage ? 1 : 0 }}>Thanks! We'll let you know.</EmailSent>
    </Section>
  );
}
