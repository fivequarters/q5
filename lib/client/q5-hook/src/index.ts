import './q5-hook.css';

export interface IQ5HookResult {
  url: string;
}

export interface IAccount {
  baseUrl: string;
  token: string;
}

export type AccountResolver = (account: IAccount) => Promise<IAccount>;

interface IHookOptions {
  boundary: string;
  function: string;
  baseUrl?: string;
  token?: string;
  accountResolver?: AccountResolver;
  editorOptions?: any;
}

export function edit(options: IHookOptions): Promise<IQ5HookResult> {
  // Normalize options
  if (!options || !options.function || !options.boundary) {
    throw new Error('options.function and options.boundary must be specified.');
  }

  if (!options.accountResolver) {
    if (options.token && options.baseUrl) {
      // @ts-ignore
      options.accountResolver = account =>
        Promise.resolve({
          token: options.token,
          baseUrl: options.baseUrl,
        });
    } else {
      throw new Error('either options.accountResolver or options.token and options.baseUrl must be specified.');
    }
  }

  // Force the existence of the close button
  options.editorOptions = options.editorOptions || {};
  options.editorOptions.actionPanel = options.editorOptions.actionPanel || {};
  options.editorOptions.actionPanel.enableClose = true;

  // Promise completes with IQ5HookResult when editor is closed by the user
  return new Promise((resolve, reject) => {
    // Set up messaging with modal iframe; the interaction is started by the
    // content of the iframe posting the { request: 'getConfiguration' }
    // message to the parent (this script).

    window.addEventListener('message', onMessage, false);

    // Set up HTML with modal iframe
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // prevent scrolling of modal's background
    const prefixId = `q5-hook-${Math.floor(99999999 * Math.random()).toString(26)}`;
    const editorContainerId = `${prefixId}-editor-container`;
    const editorFrameId = `${prefixId}-editor`;
    // TODO: set iframe URL to production URL in production build
    const editorHtml = [
      `<div id="${editorContainerId}" class="q5-hook-editor-container">`,
      `<iframe id="${editorFrameId}" width="100%" height="100%"`,
      `frameborder="0" src="http://localhost.com:4000/editor" />`,
      `</div>`,
    ].join(' ');
    document.body.insertAdjacentHTML('afterbegin', editorHtml);
    const contentWindow = (document.getElementById(editorFrameId) as HTMLIFrameElement).contentWindow;

    // Process messages from iframe hosting the editor
    function onMessage(event: MessageEvent) {
      if (event.source !== contentWindow) {
        return;
      }

      const request = (event.data && event.data.request) || 'none';
      switch (request) {
        case 'getConfiguration':
          if (!contentWindow) {
            return reject(new Error('getConfiguration requires contentWindow to be set'));
          }
          contentWindow.postMessage(
            {
              boundary: options.boundary,
              function: options.function,
              editorOptions: options.editorOptions,
              requestId: event.data.requestId,
            },
            '*'
          );
          break;
        case 'resolveAccount':
          if (!options.accountResolver) {
            return reject(new Error('resolveAccount requires options.accountResolver to be set'));
          }
          options.accountResolver(event.data).then(account => {
            if (!contentWindow) {
              return reject(new Error('resolveAccount requires contentWindow to be set'));
            }
            contentWindow.postMessage(
              {
                ...account,
                requestId: event.data.requestId,
              },
              '*'
            );
          });
          break;
        case 'closed':
          closeModal();
          resolve({ url: event.data.url });
          break;
        default:
          closeModal();
          reject(
            new Error(
              [
                `Unsupported request from Q5 Hook Editor: ${request}.`,
                'Make sure the version of the q5-hook.js you are using is up to date.',
              ].join(' ')
            )
          );
      }
    }

    function closeModal() {
      window.removeEventListener('message', onMessage);
      const editorContainer = document.getElementById(editorContainerId);
      if (editorContainer) {
        document.body.removeChild(editorContainer);
      }
      document.body.style.overflow = oldOverflow;
    }
  });
}
