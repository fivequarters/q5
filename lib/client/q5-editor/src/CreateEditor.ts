import { createActionPanel } from './CreateActionPanel';
import { createEditorPanel } from './CreateEditorPanel';
import { createLogsPanel } from './CreateLogsPanel';
import { createNavigationPanel } from './CreateNavigationPanel';
import { createStatusPanel } from './CreateStatusPanel';
import * as Events from './Events';
import * as Options from './Options';
import { IEditorOptions } from './Options';
import { Server, IAccount, AccountResolver } from './Server';
import { EditorContext } from './EditorContext';
import { IFunctionSpecification } from './FunctionSpecification';

import 'jquery-resizable-dom';

/**
 * Editor creation options.
 */
export interface ICreateEditorOptions {
  /**
   * If the specified function does not exist yet, use this template to create it.
   */
  template?: IFunctionSpecification;
  /**
   * Options that control the presentation and bahvior of the editor.
   */
  editor?: IEditorOptions;
}

/**
 * Loads or creates a function and initializes the function editor within the specified HTML element.
 * If the specified function does not exist but _options.template_ is specified, a new function is created using this template.
 * On successful intialization of the editor, [[EditorContext]] is returned which can be used to subscribe to events and manipulate the editor.
 *
 * @param element The HTML element (typically a div) within which to create the function editor.
 * @param boundaryId The boundaryId of the function.
 * @param functionId The function name.
 * @param account Account information to use when calling Flexd HTTP APIs.
 * @param options Editor creation options.
 */
export function createEditor(
  element: HTMLElement,
  boundaryId: string,
  functionId: string,
  account: IAccount | AccountResolver,
  options?: ICreateEditorOptions
): Promise<EditorContext> {
  if (!element) throw new Error('element must be specified.');
  if (!boundaryId) throw new Error('boundaryId must be specified.');
  if (!functionId) throw new Error('functionId must be specified.');
  if (!account) throw new Error('account must be specified.');

  options = options || {};
  const defaultEditorOptions = new Options.EditorOptions();
  const opts = {
    ...defaultEditorOptions,
    ...options.editor,
  };
  Object.keys(defaultEditorOptions).forEach(k => {
    // @ts-ignore
    if (opts[k] !== false) {
      // @ts-ignore
      opts[k] = {
        ...defaultEditorOptions[k],
        // @ts-ignore
        ...opts[k],
      };
    }
  });

  let server = typeof account === 'function' ? new Server(<AccountResolver>account) : Server.create(<IAccount>account);

  return server.loadEditorContext(boundaryId, functionId, options.template).then(editorContext => {
    createEditorImpl(editorContext);
    return editorContext;
  });

  function createEditorImpl(editorContext: EditorContext) {
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
        editorContext,
        opts.editorPanel as Options.IEditorPanelOptions
      );
    }
    if (opts.statusPanel !== false) {
      createStatusPanel(
        document.getElementById(statusId) as HTMLElement,
        editorContext,
        opts.statusPanel as Options.IStatusPanelOptions
      );
    }
    if (opts.navigationPanel !== false) {
      createNavigationPanel(
        document.getElementById(navId) as HTMLElement,
        editorContext,
        opts.navigationPanel as Options.INavigationPanelOptions
      );
    }
    if (opts.actionPanel !== false) {
      createActionPanel(
        document.getElementById(actionId) as HTMLElement,
        editorContext,
        server,
        opts.actionPanel as Options.IActionPanelOptions
      );
    }
    if (opts.logsPanel !== false) {
      createLogsPanel(
        document.getElementById(logsId) as HTMLElement,
        editorContext,
        opts.logsPanel as Options.ILogsPanelOptions
      );
      server.attachServerLogs(editorContext);
    }

    editorContext.on(Events.Events.LogsStateChanged, (e: Events.LogsStateChangedEvent) => {
      if (e.newState) {
        $logs.show();
        $logsSplitter.show();
      } else {
        $logs.hide();
        $logsSplitter.hide();
      }
    });

    editorContext.on(Events.Events.FullScreenChanged, (e: Events.FullScreenChangedEvent) => {
      if (e.newState) {
        // expand
        $main.addClass('q5-fullscreen');
      } else {
        // collapse
        $main.removeClass('q5-fullscreen');
      }
    });
  }
}
