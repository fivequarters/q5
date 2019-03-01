import styled from 'styled-components';

// -------------------
// Exported Components
// -------------------

export const LoginButton = styled.button`
  padding: 10px;
  margin-top: 10px;
  border: 2px solid #34495e;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'Roboto', san-serif;
  font-weight: 300;
  font-size: 18px;
  color: white;
  background-color: #34495e;
  outline: none;
  &:hover {
    color: #34495e;
    background-color: transparent;
  }
  &:hover.disable {
    color: white;
    background-color: #34495e;
  }
  &.disable {
    cursor: wait;
  }
`;
