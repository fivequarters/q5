import * as Events from './Events';
import { ILogsPanelOptions, LogsPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createLogsPanel(element: HTMLElement, editorContext: EditorContext, options?: ILogsPanelOptions) {
  const id = `flexd-logs-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(`<div class="flexd-logs" id="${id}"><pre class="flexd-logs-content" id="${id}-content"></pre></div>`);
  const $content = $(`#${id}-content`);
  const $container = $(`#${id}`);

  const defaultOptions = new LogsPanelOptions();
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  editorContext.on(Events.Events.LogsAttached, e => {
    // append('Server logs attached');
  });

  editorContext.on(Events.Events.LogsDetached, (e: Events.LogsDetachedEvent) => {
    // append(e.error ? e.error.message : 'Server logs detached');
    if (e && e.error) {
      append(e.error.message);
    }
  });

  editorContext.on(Events.Events.LogsEntry, (e: Events.LogsEntryEvent) => {
    try {
      const json = JSON.parse(e.data);
      append(`SERVER ${json.level === 30 ? 'STDOUT' : 'STDERR'}: ${json.msg}`);
    } catch (_) {
      // do nothing
    }
  });

  editorContext.on(Events.Events.BuildStarted, (e: Events.BuildStartedEvent) => {
    append(`BUILD: starting build of ${editorContext.boundaryId}/${editorContext.functionId}...`);
  });

  editorContext.on(Events.Events.BuildProgress, (e: Events.BuildProgressEvent) => {
    append(`BUILD ${e.status.id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status})`);
  });

  editorContext.on(Events.Events.BuildFinished, (e: Events.BuildFinishedEvent) => {
    if (e.status.id) {
      append(
        `BUILD ${e.status.id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status}) ${e.status
          .location || JSON.stringify(e.status.error, null, 2)}`
      );
    } else {
      append(`BUILD: success (no changes) ${e.status.location || JSON.stringify(e.status.error, null, 2)}`);
    }
  });

  editorContext.on(Events.Events.BuildError, (e: Events.BuildErrorEvent) => {
    append(`BUILD: error ${e.error.message}`);
  });

  editorContext.on(Events.Events.RunnerStarted, (e: Events.RunnerStartedEvent) => {
    append(`RUN: calling ${e.url}`);
  });

  editorContext.on(Events.Events.RunnerFinished, (e: Events.RunnerFinishedEvent) => {
    let response = e.response;
    if (e.error) {
      response = response || (e.error as any).response;
      if (!response) {
        return append(`RUN: error ${(e.error as any).stack || e.error}`);
      }
    }
    if (!response) {
      return;
    }
    const lines: string[] = [`RUN: received response HTTP ${response.statusCode}`];
    // @ts-ignore
    for (const h in response.headers) {
      if (h !== 'x-fx-logs') {
        // @ts-ignore
        lines.push(`${h}: ${response.headers[h]}`);
      }
    }
    // @ts-ignore
    if (response.text) {
      // @ts-ignore
      lines.push(`\n${response.text}`);
    }
    append(lines.join('\n'));
    // @ts-ignore
    const logs = response.headers['x-fx-logs'];
    if (logs) {
      let logsStr: string | undefined = logs.toString();
      try {
        logsStr = atob(logsStr as string);
      } catch (_) {
        logsStr = undefined;
      }
      if (logsStr) {
        append(`RUN: server logs\n${logsStr}`);
      }
    }
  });

  function append(line: string) {
    const annotatedLine = `[${new Date().toLocaleTimeString()}] ${line}\n`;
    let newContent = $content.text() + annotatedLine;
    if (newContent.length > effectiveOptions.maxSize) {
      newContent = newContent.substring(newContent.length - effectiveOptions.maxSize);
    }
    $content.text(newContent);
    setTimeout(() => ($container[0].scrollTop = $container[0].scrollHeight), 100);
  }
}
