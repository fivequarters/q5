import { createActionPanel } from './CreateActionPanel';
import { createEditorPanel } from './CreateEditorPanel';
import { createLogsPanel } from './CreateLogsPanel';
import { createNavigationPanel } from './CreateNavigationPanel';
import { createStatusPanel } from './CreateStatusPanel';
import * as Events from './Events';
import * as Options from './Options';
import { Server } from './Server';
import { Workspace } from './Workspace';

import 'jquery-resizable-dom';

/**
 * Creates the editor within the specified HTML element.
 * @param element The HTML element to create the editor within, typically a `div`.
 * @param workspace The workspace representing the function to edit.
 * @param server The server representing the Q5 Service APIs.
 * @param options Editor configuration options.
 */
export function createEditor(
  element: HTMLElement,
  workspace: Workspace,
  server: Server,
  options?: Options.IEditorOptions
) {
  const defaultOptions = new Options.EditorOptions();
  const opts = {
    ...defaultOptions,
    ...options,
  };
  Object.keys(defaultOptions).forEach(k => {
    // @ts-ignore
    if (opts[k] !== false) {
      // @ts-ignore
      opts[k] = {
        ...defaultOptions[k],
        // @ts-ignore
        ...opts[k],
      };
    }
  });

  if (opts.navigationPanel === false && opts.logsPanel === false && opts.actionPanel !== false) {
    (opts.actionPanel as Options.IActionPanelOptions).enableCodeOnlyToggle = false;
  }

  const idPrefix = `q5-${Math.floor(99999999 * Math.random()).toString(26)}`;
  const actionId = `${idPrefix}-action`;
  const navEditorContainerId = `${idPrefix}-nav-editor-container`;
  const navId = `${idPrefix}-nav`;
  const navSplitterId = `${idPrefix}-nav-splitter`;
  const editorId = `${idPrefix}-editor`;
  const logsId = `${idPrefix}-logs`;
  const logsSplitterId = `${idPrefix}-logs-splitter`;
  const statusId = `${idPrefix}-status`;

  const lines: string[] = [`<div id="${idPrefix}" class="q5-shell"><div id="${idPrefix}-main" class="q5-main">`];
  if (opts.actionPanel !== false) {
    lines.push(`    <div id="${actionId}" class="q5-action-container"></div>`);
  }
  if (opts.navigationPanel !== false) {
    lines.push(`    <div class="q5-nav-container" id="${navId}"></div>`);
  }
  if (opts.navigationPanel !== false && opts.editorPanel !== false) {
    lines.push(`    <div class="q5-nav-splitter" id="${navSplitterId}"></div>`);
  }
  if (opts.editorPanel !== false) {
    lines.push(`    <div class="q5-nav-editor-container" id="${navEditorContainerId}">`);

    lines.push(`        <div class="q5-editor-container" id="${editorId}"></div>`);
    if (opts.logsPanel !== false) {
      lines.push(`    <div class="q5-logs-splitter" id="${logsSplitterId}"></div>`);
      lines.push(`    <div class="q5-logs-container" id="${logsId}"></div>`);
    }
    lines.push('    </div>');
  }
  lines.push('</div>');
  if (opts.statusPanel !== false) {
    lines.push(`    <div class="q5-status-container" id="${statusId}"></div>`);
  }
  lines.push('</div>');

  $(element).html(lines.join('\n'));

  const $main = $(`#${idPrefix}`);
  const $nav = $(`#${navId}`);
  const $logs = $(`#${logsId}`);
  const $editor = $(`#${editorId}`);
  const $navEditorContainer = $(`#${navEditorContainerId}`);
  const $logsSplitter = $(`#${logsSplitterId}`);
  const $navSplitter = $(`#${navSplitterId}`);

  if (opts.navigationPanel !== false) {
    // Keep editorMinWidth in sync with min-width of .q5-editor-container class
    const editorMinWidth = 100;
    // @ts-ignore
    $nav.resizable({
      handleSelector: `#${navSplitterId}`,
      resizeHeight: false,
      // @ts-ignore
      onDrag(e, $el, newWidth, newHeight, opt) {
        if (($editor.width() || 0) - (newWidth - $el.width()) < editorMinWidth) {
          return false;
        }
        return true;
      },
    });
  }
  if (opts.logsPanel !== false) {
    // Keep navEditorMinHeight in sync with min-height of .q5-nav-editor-container class
    const navEditorMinHeight = 100;
    // @ts-ignore
    $logs.resizable({
      handleSelector: `#${logsSplitterId}`,
      resizeWidth: false,
      resizeHeightFrom: 'top',
      // @ts-ignore
      onDrag(e, $el, newWidth, newHeight, opt) {
        if (($navEditorContainer.height() || 0) - (newHeight - $el.height()) < navEditorMinHeight) {
          return false;
        }
        return true;
      },
    });
  }

  if (opts.editorPanel !== false) {
    createEditorPanel(
      document.getElementById(editorId) as HTMLElement,
      workspace,
      opts.editorPanel as Options.IEditorPanelOptions
    );
  }
  if (opts.statusPanel !== false) {
    createStatusPanel(
      document.getElementById(statusId) as HTMLElement,
      workspace,
      opts.statusPanel as Options.IStatusPanelOptions
    );
  }
  if (opts.navigationPanel !== false) {
    createNavigationPanel(
      document.getElementById(navId) as HTMLElement,
      workspace,
      opts.navigationPanel as Options.INavigationPanelOptions
    );
  }
  if (opts.actionPanel !== false) {
    createActionPanel(
      document.getElementById(actionId) as HTMLElement,
      workspace,
      server,
      opts.actionPanel as Options.IActionPanelOptions
    );
  }
  if (opts.logsPanel !== false) {
    createLogsPanel(
      document.getElementById(logsId) as HTMLElement,
      workspace,
      opts.logsPanel as Options.ILogsPanelOptions
    );
    server.attachServerLogs(workspace);
  }

  workspace.on(Events.Events.LogsStateChanged, (e: Events.LogsStateChangedEvent) => {
    if (e.newState) {
      $logs.show();
      $logsSplitter.show();
    } else {
      $logs.hide();
      $logsSplitter.hide();
    }
  });

  workspace.on(Events.Events.FullScreenChanged, (e: Events.FullScreenChangedEvent) => {
    if (e.newState) {
      // expand
      $main.addClass('q5-fullscreen');
    } else {
      // collapse
      $main.removeClass('q5-fullscreen');
    }
  });
}
