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

  const lines: string[] = [
    `<div class="fusebit-action-wrapper">
    <div>`,
  ];
  if (opts.enableClose) {
    lines.push(
      `        <button id="${closeId}" class="fusebit-action-btn"><i class="fa fa-window-close"></i></button>`
    );
  }
  lines.push(`        <button id="${saveId}" class="fusebit-action-btn"><i class="fa fa-save"></i></button>
        <button id="${runId}" class="fusebit-action-btn"><i class="fa fa-play"></i></button>
   `);
  if (opts.enableCodeOnlyToggle) {
    lines.push(`
        <button id="${hideNavLogsId}" class="fusebit-action-btn">
          <i class="far fa-file-code"></i>
        </button>
        <button id="${showNavLogsId}" class="fusebit-action-btn" style="display: none">
          <i class="fas fa-file-code"></i>
        </button>
`);
  }
  if (opts.enableFullScreen) {
    lines.push(`
        <button id="${expandId}" class="fusebit-action-btn"><i class="fa fa-arrows-alt"></i></button>
        <button id="${compressId}" class="fusebit-action-btn" style="display: none"><i class="fa fa-compress"></i></button>
`);
  }
  lines.push(`
    </div>
</div>`);

  $(element).html(lines.join('\n'));

  const $save = $(`#${saveId}`);
  const $close = $(`#${closeId}`);
  const $run = $(`#${runId}`);
  const $expand = $(`#${expandId}`);
  const $compress = $(`#${compressId}`);
  const $hideNavLogs = $(`#${hideNavLogsId}`);
  const $showNavLogs = $(`#${showNavLogsId}`);

  $close.click(e => {
    e.preventDefault();
    editorContext.close();
  });

  $hideNavLogs.click(e => {
    e.preventDefault();
    $hideNavLogs.hide();
    $showNavLogs.show();
    editorContext.updateLogsState(false);
    editorContext.updateNavState(false);
  });

  $showNavLogs.click(e => {
    e.preventDefault();
    $hideNavLogs.show();
    $showNavLogs.hide();
    editorContext.updateLogsState(true);
    editorContext.updateNavState(true);
  });

  $expand.click(e => {
    e.preventDefault();
    $expand.hide();
    $compress.show();
    editorContext.setFullScreen(true);
  });

  $compress.click(e => {
    e.preventDefault();
    $expand.show();
    $compress.hide();
    editorContext.setFullScreen(false);
  });

  $save.click(e => {
    e.preventDefault();
    server.saveFunction(editorContext).catch(_ => {});
  });

  $run.click(e => {
    e.preventDefault();
    server.runFunction(editorContext).catch(_ => {
      // do nothing
    });
  });

  editorContext.on(Events.DirtyStateChanged, updateState);
  editorContext.on(Events.ReadOnlyStateChanged, updateState);

  function updateState() {
    editorContext.dirtyState ? $save.removeAttr('disabled') : $save.attr('disabled', 'disabled');
    editorContext.readOnly ? $run.attr('disabled', 'disabled') : $run.removeAttr('disabled');
  }

  updateState();
}
