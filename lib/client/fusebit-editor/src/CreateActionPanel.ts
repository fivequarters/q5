import { Events } from './Events';
import { ActionPanelOptions, IActionPanelOptions } from './Options';
import { Server } from './Server';
import { EditorContext } from './EditorContext';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param server
 * @param options
 */
export function createActionPanel(
  element: HTMLElement,
  editorContext: EditorContext,
  server: Server,
  options?: IActionPanelOptions
) {
  const defaultOptions = new ActionPanelOptions();
  const opts = {
    ...defaultOptions,
    ...options,
  };

  const idPrefix = `fusebit-action-${Math.floor(99999999 * Math.random()).toString(26)}`;
  const closeId = `${idPrefix}-close`;
  const saveId = `${idPrefix}-save`;
  const runId = `${idPrefix}-run`;
  const expandId = `${idPrefix}-expand`;
  const compressId = `${idPrefix}-compress`;
  const hideNavLogsId = `${idPrefix}-hide-nav-logs`;
  const showNavLogsId = `${idPrefix}-show-nav-logs`;

  const lines: string[] = [`<div class="fusebit-action-wrapper">`, `<div>`];
  if (opts.enableClose) {
    lines.push(`<button id="${closeId}" class="fusebit-action-btn"><i class="fa fa-window-close"></i></button>`);
  }
  if (opts.enableSave) {
    lines.push(`<button id="${saveId}" class="fusebit-action-btn"><i class="fa fa-save"></i></button>`);
  }
  if (opts.enableRun) {
    lines.push(`<button id="${runId}" class="fusebit-action-btn"><i class="fa fa-play"></i></button>`);
  }
  if (opts.enableCodeOnlyToggle) {
    lines.push(
      `<button id="${hideNavLogsId}" class="fusebit-action-btn">`,
      `<i class="far fa-file-code"></i>`,
      `</button>`,
      `<button id="${showNavLogsId}" class="fusebit-action-btn" style="display: none">`,
      `<i class="fas fa-file-code"></i>`,
      `</button>`
    );
  }
  if (opts.enableFullScreen) {
    lines.push(
      `<button id="${expandId}" class="fusebit-action-btn"><i class="fa fa-arrows-alt"></i></button>`,
      `<button id="${compressId}" class="fusebit-action-btn" style="display: none"><i class="fa fa-compress"></i></button>`
    );
  }
  lines.push(`</div></div>`);

  element.innerHTML = lines.join('');

  const saveElement = document.getElementById(saveId) as HTMLElement;
  const closeElement = document.getElementById(closeId) as HTMLElement;
  const runElement = document.getElementById(runId) as HTMLElement;
  const expandElement = document.getElementById(expandId) as HTMLElement;
  const compressElement = document.getElementById(compressId) as HTMLElement;
  const hideNavLogsElement = document.getElementById(hideNavLogsId) as HTMLElement;
  const showNavLogsElement = document.getElementById(showNavLogsId) as HTMLElement;

  closeElement &&
    closeElement.addEventListener('click', e => {
      e.preventDefault();
      editorContext.close();
    });

  hideNavLogsElement &&
    hideNavLogsElement.addEventListener('click', e => {
      e.preventDefault();
      hideNavLogsElement.style.display = 'none';
      delete showNavLogsElement.style.display;
      editorContext.updateLogsState(false);
      editorContext.updateNavState(false);
    });

  showNavLogsElement &&
    showNavLogsElement.addEventListener('click', e => {
      e.preventDefault();
      delete hideNavLogsElement.style.display;
      showNavLogsElement.style.display = 'none';
      editorContext.updateLogsState(true);
      editorContext.updateNavState(true);
    });

  expandElement &&
    expandElement.addEventListener('click', e => {
      e.preventDefault();
      expandElement.style.display = 'none';
      delete compressElement.style.display;
      editorContext.setFullScreen(true);
    });

  compressElement &&
    compressElement.addEventListener('click', e => {
      e.preventDefault();
      delete expandElement.style.display;
      compressElement.style.display = 'none';
      editorContext.setFullScreen(false);
    });

  saveElement &&
    saveElement.addEventListener('click', e => {
      e.preventDefault();
      server.saveFunction(editorContext).catch(_ => {});
    });

  runElement &&
    runElement.addEventListener('click', e => {
      e.preventDefault();
      server.runFunction(editorContext).catch(_ => {
        // do nothing
      });
    });

  editorContext.on(Events.DirtyStateChanged, updateState);
  editorContext.on(Events.ReadOnlyStateChanged, updateState);

  function updateState() {
    if (saveElement) {
      editorContext.dirtyState
        ? saveElement.removeAttribute('disabled')
        : saveElement.setAttribute('disabled', 'disabled');
    }
    if (runElement) {
      editorContext.readOnly ? runElement.setAttribute('disabled', 'disabled') : runElement.removeAttribute('disabled');
    }
  }

  updateState();
}
