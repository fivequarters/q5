import './q5-hook.css';

export interface IQ5HookResult {
  url: string;
}

export interface Account {
  baseUrl: string;
  token: string;
}

export interface AccountResolver {
  (account: Account): Promise<Account>;
}

interface IHookOptions {
  boundary: string;
  function: string;
  baseUrl?: string;
  token?: string;
  accountResolver?: AccountResolver;
  template?: any;
}

export function edit(options: IHookOptions): Promise<IQ5HookResult> {
  // Normalize options
  if (!options || !options.function || !options.boundary)
    throw new Error('options.function and options.boundary must be specified.');

  if (!options.accountResolver) {
    if (options.token && options.baseUrl) {
      //@ts-ignore
      options.accountResolver = account =>
        Promise.resolve({
          token: options.token,
          baseUrl: options.baseUrl,
        });
    } else {
      throw new Error('either options.accountResolver or options.token and options.baseUrl must be specified.');
    }
  }

  // Promise completes with IQ5HookResult when editor is closed by the user
  return new Promise((resolve, reject) => {
    // Set up messaging with modal iframe; the interaction is started by the
    // content of the iframe posting the { request: 'getConfiguration' }
    // message to the parent (this script).

    window.addEventListener('message', onMessage, false);

    // Set up HTML with modal iframe
    let oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // prevent scrolling of modal's background
    let prefixId = `q5-hook-${Math.floor(99999999 * Math.random()).toString(26)}`;
    let editorContainerId = `${prefixId}-editor-container`;
    let editorFrameId = `${prefixId}-editor`;
    // TODO: set iframe URL to production URL in production build
    let editorHtml = `<div id="${editorContainerId}" class="q5-hook-editor-container"><iframe id="${editorFrameId}" width="100%" height="100%" frameborder="0" src="http://localhost.com:3000/editor" /></div>`;
    document.body.insertAdjacentHTML('afterbegin', editorHtml);
    let contentWindow = (<HTMLIFrameElement>document.getElementById(editorFrameId)).contentWindow;

    // Process messages from iframe hosting the editor
    function onMessage(event: MessageEvent) {
      if (event.source !== contentWindow) {
        return;
      }

      let request = (event.data && event.data.request) || 'none';
      switch (request) {
        case 'getConfiguration':
          if (!contentWindow) return reject(new Error('getConfiguration requires contentWindow to be set'));
          contentWindow.postMessage(
            {
              boundary: options.boundary,
              function: options.function,
              template: options.template,
              requestId: event.data.requestId,
            },
            '*'
          );
          break;
        case 'resolveAccount':
          if (!options.accountResolver)
            return reject(new Error('resolveAccount requires options.accountResolver to be set'));
          options.accountResolver(event.data).then(account => {
            if (!contentWindow) return reject(new Error('resolveAccount requires contentWindow to be set'));
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
              `Unsupported request from Q5 Hook Editor: ${request}. Make sure the version of the q5-hook.js you are using is up to date.`
            )
          );
      }
    }

    function closeModal() {
      window.removeEventListener('message', onMessage);
      let editorContainer = document.getElementById(editorContainerId);
      if (editorContainer) {
        document.body.removeChild(editorContainer);
      }
      document.body.style.overflow = oldOverflow;
    }
  });
}
