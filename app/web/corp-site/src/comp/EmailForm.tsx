import React, { useState } from 'react';
import styled from 'styled-components';
import { IoIosAddCircleOutline } from 'react-icons/io';

import { applyTheme } from '../util';

// ------------------
// Internal Constants
// ------------------

const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

// -------------------
// Internal Components
// -------------------

//#34495e
const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
  padding: 60px;
  ${props => applyTheme(props, 'email')}
`;

const Gutter = styled.div`
  min-width: 50px;
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
  margin-bottom: 40px;
  ${props => applyTheme(props, 'email', 'message')}
`;

const PlusIcon = styled(IoIosAddCircleOutline)`
  width: 30px;
  height: 30px;
  color: white;
  &:hover {
    color: white;
  }
`;

const Content = styled.div``;

const Input = styled.input`
  width: 250px;
  outline: none;
  margin-right: 10px;
  border: 0px;
  border-bottom: 1px dotted white;
  &::placeholder {
    color: #abebc6;
  }
  ${props => applyTheme(props, 'email', 'input')}
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

export function EmailForm() {
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
    <Container>
      <Gutter />
      <InnerContainer>
        <Column>
          <Message>We're furiously building our first product.</Message>
          <Message>Want us to keep you updated?</Message>
          <Form>
            <Input type="text" placeholder="Email" value={email} onChange={onEmailChange} />
            <PlusIcon onClick={onButtonClicked} />
          </Form>
        </Column>
      </InnerContainer>
      <Gutter />
      {/* <Content></Content>
      
      <EmailSent style={{ opacity: showEmailMessage ? 1 : 0 }}>Thanks! We'll let you know.</EmailSent> */}
    </Container>
  );
}
