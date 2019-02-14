import { Workspace } from './Workspace';
import { Events } from './Events';
import { Server } from './Server';
import { IActionPanelOptions, ActionPanelOptions } from './Options';

export function createActionPanel(
  element: HTMLElement,
  workspace: Workspace,
  server: Server,
  options?: IActionPanelOptions
) {
  let defaultOptions = new ActionPanelOptions();
  let opts = {
    ...defaultOptions,
    ...options,
  };

  let idPrefix = `q5-action-${Math.floor(99999999 * Math.random()).toString(26)}`;
  let closeId = `${idPrefix}-close`;
  let saveId = `${idPrefix}-save`;
  let runId = `${idPrefix}-run`;
  let expandId = `${idPrefix}-expand`;
  let compressId = `${idPrefix}-compress`;
  let hideNavLogsId = `${idPrefix}-hide-nav-logs`;
  let showNavLogsId = `${idPrefix}-show-nav-logs`;

  let lines: string[] = [
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
        <button id="${hideNavLogsId}" class="q5-action-btn"><i class="far fa-file-code"></i></button>
        <button id="${showNavLogsId}" class="q5-action-btn" style="display: none"><i class="fas fa-file-code"></i></button>
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

  let $save = $(`#${saveId}`);
  let $close = $(`#${closeId}`);
  let $run = $(`#${runId}`);
  let $expand = $(`#${expandId}`);
  let $compress = $(`#${compressId}`);
  let $hideNavLogs = $(`#${hideNavLogsId}`);
  let $showNavLogs = $(`#${showNavLogsId}`);

  $close.click(function(e) {
    e.preventDefault();
    workspace.close();
  });

  $hideNavLogs.click(function(e) {
    e.preventDefault();
    $hideNavLogs.hide();
    $showNavLogs.show();
    workspace.updateLogsState(false);
    workspace.updateNavState(false);
  });

  $showNavLogs.click(function(e) {
    e.preventDefault();
    $hideNavLogs.show();
    $showNavLogs.hide();
    workspace.updateLogsState(true);
    workspace.updateNavState(true);
  });

  $expand.click(function(e) {
    e.preventDefault();
    $expand.hide();
    $compress.show();
    workspace.setFullScreen(true);
  });

  $compress.click(function(e) {
    e.preventDefault();
    $expand.show();
    $compress.hide();
    workspace.setFullScreen(false);
  });

  $save.click(function(e) {
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

  $run.click(function(e) {
    e.preventDefault();
    server.runFunction(workspace).catch(_ => {});
  });

  workspace.on(Events.DirtyStateChanged, updateState);
  workspace.on(Events.ReadOnlyStateChanged, updateState);

  function updateState() {
    workspace.dirtyState ? $save.removeAttr('disabled') : $save.attr('disabled', 'disabled');
    workspace.readOnly ? $run.attr('disabled', 'disabled') : $run.removeAttr('disabled');
  }

  updateState();
}
