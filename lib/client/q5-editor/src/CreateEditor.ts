import { Workspace } from './Workspace';
import { Server } from './Server';
import * as Options from './Options';
import { createEditorPanel } from './CreateEditorPanel';
import { createStatusPanel } from './CreateStatusPanel';
import { createNavigationPanel } from './CreateNavigationPanel';
import { createActionPanel } from './CreateActionPanel';
import { createLogsPanel } from './CreateLogsPanel';
import * as Events from './Events';

import 'jquery-resizable-dom';

export function createEditor(
  element: HTMLElement,
  workspace: Workspace,
  server: Server,
  options?: Options.IEditorOptions
) {
  let defaultOptions = new Options.EditorOptions();
  let opts = {
    ...defaultOptions,
    ...options,
  };
  Object.keys(defaultOptions).forEach(k => {
    //@ts-ignore
    if (opts[k] !== false) {
      //@ts-ignore
      opts[k] = {
        ...defaultOptions[k],
        //@ts-ignore
        ...opts[k],
      };
    }
  });

  if (opts.navigationPanel === false && opts.logsPanel === false && opts.actionPanel !== false) {
    (<Options.IActionPanelOptions>opts.actionPanel).enableCodeOnlyToggle = false;
  }

  let idPrefix = `q5-${Math.floor(99999999 * Math.random()).toString(26)}`;
  let actionId = `${idPrefix}-action`;
  let navEditorContainerId = `${idPrefix}-nav-editor-container`;
  let navId = `${idPrefix}-nav`;
  let navSplitterId = `${idPrefix}-nav-splitter`;
  let editorId = `${idPrefix}-editor`;
  let logsId = `${idPrefix}-logs`;
  let logsSplitterId = `${idPrefix}-logs-splitter`;
  let statusId = `${idPrefix}-status`;

  let lines: string[] = [`<div id="${idPrefix}" class="q5-main">`];
  if (opts.actionPanel !== false) {
    lines.push(`    <div id="${actionId}" class="q5-action-container"></div>`);
  }
  if (opts.navigationPanel !== false || opts.editorPanel !== false) {
    lines.push(`    <div class="q5-nav-editor-container" id="${navEditorContainerId}">`);
    if (opts.navigationPanel !== false) {
      lines.push(`        <div class="q5-nav-container" id="${navId}"></div>`);
      lines.push(`        <div class="q5-nav-splitter" id="${navSplitterId}"></div>`);
    }
    if (opts.editorPanel !== false) {
      lines.push(`        <div class="q5-editor-container" id="${editorId}"></div>`);
    }
    lines.push('    </div>');
  }
  if (opts.logsPanel !== false) {
    lines.push(`    <div class="q5-logs-splitter" id="${logsSplitterId}"></div>`);
    lines.push(`    <div class="q5-logs-container" id="${logsId}"></div>`);
  }
  if (opts.statusPanel !== false) {
    lines.push(`    <div class="q5-status-container" id="${statusId}"></div>`);
  }
  lines.push('</div>');

  $(element).html(lines.join('\n'));

  let $main = $(`#${idPrefix}`);
  let $nav = $(`#${navId}`);
  let $logs = $(`#${logsId}`);
  let $editor = $(`#${editorId}`);
  let $navEditorContainer = $(`#${navEditorContainerId}`);
  let $logsSplitter = $(`#${logsSplitterId}`);
  let $navSplitter = $(`#${navSplitterId}`);

  if (opts.navigationPanel !== false) {
    // Keep editorMinWidth in sync with min-width of .q5-editor-container class
    let editorMinWidth = 100;
    // @ts-ignore
    $nav.resizable({
      handleSelector: `#${navSplitterId}`,
      resizeHeight: false,
      // @ts-ignore
      onDrag: function(e, $el, newWidth, newHeight, opt) {
        if (($editor.width() || 0) - (newWidth - $el.width()) < editorMinWidth) {
          return false;
        }
        return true;
      },
    });
  }
  if (opts.logsPanel !== false) {
    // Keep navEditorMinHeight in sync with min-height of .q5-nav-editor-container class
    let navEditorMinHeight = 100;
    // @ts-ignore
    $logs.resizable({
      handleSelector: `#${logsSplitterId}`,
      resizeWidth: false,
      resizeHeightFrom: 'top',
      // @ts-ignore
      onDrag: function(e, $el, newWidth, newHeight, opt) {
        if (($navEditorContainer.height() || 0) - (newHeight - $el.height()) < navEditorMinHeight) {
          return false;
        }
        return true;
      },
    });
  }

  if (opts.editorPanel !== false) {
    createEditorPanel(<HTMLElement>document.getElementById(editorId), workspace, <Options.IEditorPanelOptions>(
      opts.editorPanel
    ));
  }
  if (opts.statusPanel !== false) {
    createStatusPanel(<HTMLElement>document.getElementById(statusId), workspace, <Options.IStatusPanelOptions>(
      opts.statusPanel
    ));
  }
  if (opts.navigationPanel !== false) {
    createNavigationPanel(<HTMLElement>document.getElementById(navId), workspace, <Options.INavigationPanelOptions>(
      opts.navigationPanel
    ));
  }
  if (opts.actionPanel !== false) {
    createActionPanel(<HTMLElement>document.getElementById(actionId), workspace, server, <Options.IActionPanelOptions>(
      opts.actionPanel
    ));
  }
  if (opts.logsPanel !== false) {
    createLogsPanel(<HTMLElement>document.getElementById(logsId), workspace, <Options.ILogsPanelOptions>opts.logsPanel);
  }

  workspace.on(Events.Events.NavStateChanged, function(e: Events.NavStateChangedEvent) {
    if (e.newState) {
      $nav.show();
      $navSplitter.show();
    } else {
      $nav.hide();
      $navSplitter.hide();
    }
  });

  workspace.on(Events.Events.LogsStateChanged, function(e: Events.LogsStateChangedEvent) {
    if (e.newState) {
      $logs.show();
      $logsSplitter.show();
    } else {
      $logs.hide();
      $logsSplitter.hide();
    }
  });

  workspace.on(Events.Events.FullScreenChanged, function(e: Events.FullScreenChangedEvent) {
    if (e.newState) {
      // expand
      $main.addClass('q5-fullscreen');
    } else {
      // collapse
      $main.removeClass('q5-fullscreen');
    }
  });
}
