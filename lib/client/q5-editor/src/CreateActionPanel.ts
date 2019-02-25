import { Events } from './Events';
import { ActionPanelOptions, IActionPanelOptions } from './Options';
import { Server } from './Server';
import { Workspace } from './Workspace';

export function createActionPanel(
  element: HTMLElement,
  workspace: Workspace,
  server: Server,
  options?: IActionPanelOptions
) {
  const defaultOptions = new ActionPanelOptions();
  const opts = {
    ...defaultOptions,
    ...options,
  };

  const idPrefix = `q5-action-${Math.floor(99999999 * Math.random()).toString(26)}`;
  const closeId = `${idPrefix}-close`;
  const saveId = `${idPrefix}-save`;
  const runId = `${idPrefix}-run`;
  const expandId = `${idPrefix}-expand`;
  const compressId = `${idPrefix}-compress`;
  const hideNavLogsId = `${idPrefix}-hide-nav-logs`;
  const showNavLogsId = `${idPrefix}-show-nav-logs`;

  const lines: string[] = [
    `<div class="q5-action-wrapper">
    <div>`,
  ];
  if (opts.enableClose) {
    lines.push(`        <button id="${closeId}" class="q5-action-btn"><i class="fa fa-window-close"></i></button>`);
  }
  lines.push(`        <button id="${saveId}" class="q5-action-btn"><i class="fa fa-save"></i></button>
        <button id="${runId}" class="q5-action-btn"><i class="fa fa-play"></i></button>
   `);
  if (opts.enableCodeOnlyToggle) {
    lines.push(`
        <button id="${hideNavLogsId}" class="q5-action-btn">
          <i class="far fa-file-code"></i>
        </button>
        <button id="${showNavLogsId}" class="q5-action-btn" style="display: none">
          <i class="fas fa-file-code"></i>
        </button>
`);
  }
  if (opts.enableFullScreen) {
    lines.push(`
        <button id="${expandId}" class="q5-action-btn"><i class="fa fa-arrows-alt"></i></button>
        <button id="${compressId}" class="q5-action-btn" style="display: none"><i class="fa fa-compress"></i></button>
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
    workspace.close();
  });

  $hideNavLogs.click(e => {
    e.preventDefault();
    $hideNavLogs.hide();
    $showNavLogs.show();
    workspace.updateLogsState(false);
    workspace.updateNavState(false);
  });

  $showNavLogs.click(e => {
    e.preventDefault();
    $hideNavLogs.show();
    $showNavLogs.hide();
    workspace.updateLogsState(true);
    workspace.updateNavState(true);
  });

  $expand.click(e => {
    e.preventDefault();
    $expand.hide();
    $compress.show();
    workspace.setFullScreen(true);
  });

  $compress.click(e => {
    e.preventDefault();
    $expand.show();
    $compress.hide();
    workspace.setFullScreen(false);
  });

  $save.click(e => {
    e.preventDefault();
    workspace.setDirtyState(false);
    workspace.setReadOnly(true);
    server
      .buildFunction(workspace)
      .then(_ => {
        workspace.setReadOnly(false);
      })
      .catch(_ => {
        workspace.setReadOnly(false);
        workspace.setDirtyState(true);
        updateState();
      });
  });

  $run.click(e => {
    e.preventDefault();
    server.runFunction(workspace).catch(_ => {
      // do nothing
    });
  });

  workspace.on(Events.DirtyStateChanged, updateState);
  workspace.on(Events.ReadOnlyStateChanged, updateState);

  function updateState() {
    workspace.dirtyState ? $save.removeAttr('disabled') : $save.attr('disabled', 'disabled');
    workspace.readOnly ? $run.attr('disabled', 'disabled') : $run.removeAttr('disabled');
  }

  updateState();
}
