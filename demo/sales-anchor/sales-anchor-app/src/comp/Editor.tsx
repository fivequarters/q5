import { createEditor, Server, Workspace } from 'q5'; // tslint:disable-line
import React, { useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  width: 700px;
  background-color: #e5e7e9;
  margin: 0px auto;
  color: #34495e;
  font-family: 'Roboto', san-serif;
  font-size: 14px;
  padding: 10px;
`;

const BackButton = styled.div`
  font-size: 18px;
  &:hover {
    color: white;
    cursor: pointer;
  }
`;

const Title = styled.div`
  flex: 1;
  padding-top: 3px;
  text-align: center;
  margin-left: -10px;
`;

const EditorContainer = styled.div`
  margin-top: -2px;
  width: 700px;
  height: 400px;
  margin: 0px auto;
`;

// --------------
// Exported Types
// --------------

export type EditorProps = {
  eventAction: string;
  onEditorBack: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Editor({ eventAction, onEditorBack, ...rest }: EditorProps) {
  const editorElement = useRef(null);

  async function loadEditor() {
    const server = Server.create({
      baseUrl: 'http://localhost:3001',
      token: 'p89s4J57pMA85D57szI2gjDQH1rh4K4CM37DYl58oQc',
    });

    const editorOptions = {
      navigationPanel: {
        hideFiles: ['index.js'],
      },
    };

    const workspace = await server.loadWorkspace('contoso', 'on-new-inquiry', new Workspace());
    if (editorElement && editorElement.current) {
      createEditor(editorElement.current, workspace, server, editorOptions);
      workspace.selectFile('onNewInquiry.js');
      workspace.on('closed', onEditorBack);
    }
  }

  useLayoutEffect(() => {
    loadEditor();
  }, [eventAction]);

  return (
    <Container {...rest}>
      {/* <TopBar>
        <BackButton onClick={() => onEditorBack()}>
          <TiArrowBack />
        </BackButton>
        <Title>Event: On New Inquiry</Title>
      </TopBar> */}
      <EditorContainer id="editor" ref={editorElement} />;
    </Container>
  );
}
