import * as Events from './Events';
import { ILogsPanelOptions, LogsPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

/**
 * Creates a logs panel within the specified HTML element and associacted with the existing [[EditorContext]].
 *
 * @param element The HTML element (typically a div) within which to create the logs panel.
 * @param editorContext A pre-existing editor context to associate the logs panel with.
 * @param options Logs panel creation options.
 */
export function createLogsPanel(element: HTMLElement, editorContext: EditorContext<any>, options?: ILogsPanelOptions) {
  const id = `fusebit-logs-${Math.floor(99999999 * Math.random()).toString(26)}`;
  element.innerHTML = [
    `<div class="fusebit-logs-inner-container">`,
    `<div class="fusebit-logs-delete-container"><button class="fusebit-logs-delete-btn" id="${id}-delete"><i class="fa fa-trash"></i></button></div>`,
    `<div class="fusebit-logs" id="${id}">`,
    `<pre class="fusebit-logs-content" id="${id}-content"></pre>`,
    `</div>`,
    `</div>`,
  ].join('');
  const contentElement = document.getElementById(`${id}-content`) as HTMLElement;
  const deleteElement = document.getElementById(`${id}-delete`) as HTMLElement;
  const containerElement = document.getElementById(id) as HTMLElement;

  const defaultOptions = new LogsPanelOptions();
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  deleteElement &&
    deleteElement.addEventListener('click', (e) => {
      e.preventDefault();
      contentElement.textContent = '';
    });

  let logsAttachedOnce: boolean = false;
  editorContext.on(Events.Events.LogsAttached, (e) => {
    if (!logsAttachedOnce) {
      logsAttachedOnce = true;
      append('XAttached to real-time logs...');
    }
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
      append(`${json.method || 'SERVER'} ${json.level === 30 ? 'STDOUT' : 'STDERR'}: ${json.msg}`);
    } catch (_) {
      // do nothing
    }
  });

  editorContext.on(Events.Events.BuildStarted, (e: Events.BuildStartedEvent) => {
    append(`BUILD: starting build of ${editorContext.boundaryId}/${editorContext.functionId}...`);
  });

  editorContext.on(Events.Events.BuildProgress, (e: Events.BuildProgressEvent) => {
    append(`BUILD ${e.status.buildId}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status})`);
  });

  editorContext.on(Events.Events.BuildFinished, (e: Events.BuildFinishedEvent) => {
    switch (e.status.status) {
      case 'success':
        append(`BUILD SUCCESS: ${e.status.location}`);
        break;
      case 'building':
        append(`BUILD ${e.status.buildId}: progress ${Math.floor((e.status.progress || 0) * 100)}%`);
        break;
      case 'failed':
        append(`BUILD ERROR: ${JSON.stringify(e.status.error, null, 2)}`);
        break;
      case 'unchanged':
        append(`BUILD SUCCESS: no changes`);
        break;
      default:
        append(`BUILD STATUS: ${e.status.status || JSON.stringify(e.status.error, null, 2)}`);
        break;
    }
  });

  editorContext.on(Events.Events.BuildError, (e: Events.BuildErrorEvent) => {
    let status = e.error.status || e.error.statusCode;
    let message = e.error.message;
    if (status) {
      let lines = [`BUILD ERROR: HTTP ${status}`];
      if (message) {
        lines.push(message);
      }
      append(lines.join('\n'));
    } else if (message) {
      append(`BUILD ERROR: ${e.error.message}`);
    }
  });

  editorContext.on(Events.Events.RunnerStarted, (e: Events.RunnerStartedEvent) => {
    append(`RUN: calling ${e.url}`);
  });

  editorContext.on(Events.Events.RunnerFinished, (e: Events.RunnerFinishedEvent) => {
    let response: any = e.response || (e.error && (e.error as any).response);

    // Delay showinging response to allow for logs to be pulled.
    setTimeout(showResponse, 1500);

    function showResponse() {
      if (e.error) {
        if (!response) {
          return append(`RUN: error ${(e.error as any).stack || e.error}`);
        }
      }
      if (!response) {
        return;
      }
      const lines: string[] = [];
      let responseSource = response.headers['x-fx-response-source'];
      if (responseSource === 'provider' && response.body) {
        lines.push(`RUN: function error HTTP ${response.statusCode}`);
        if (response.body.properties) {
          let trace = response.body.properties.trace || response.body.properties.stackTrace;
          if (trace && Array.isArray(trace)) {
            trace.forEach((x) => lines.push(x));
          }
        }
        if (lines.length === 1 && response.body.message) {
          lines.push(response.body.message);
        }
      } else if (responseSource === 'proxy' && response.body) {
        if (response.statusCode === 404) {
          lines.push('RUN: function not found. Did you save the function before running it?');
        } else {
          lines.push(`RUN: infrastructure error HTTP ${response.statusCode}`);
          if (response.body.message) {
            lines.push(response.body.message);
          }
        }
      } else {
        lines.push(`RUN: function finished`, `HTTP ${response.statusCode}`);
        for (const h in response.headers) {
          if (h !== 'x-fx-logs') {
            lines.push(`${h}: ${response.headers[h]}`);
          }
        }
        if ((response.headers['content-type'] || '').match(/application\/json/)) {
          try {
            response.text = JSON.stringify(JSON.parse(response.text), null, 2);
          } catch (_) {}
        }
        if (response.text) {
          if (response.text.length > 2048) {
            response.text = response.text.substring(0, 2048);
            lines.push(`\n${response.text}...`, `...response body truncated to 2KB`);
          } else {
            lines.push(`\n${response.text}`);
          }
        }
      }
      append(lines.join('\n'));
      const logs = response.headers['x-fx-logs'];
      if (logs) {
        let logsStr: string | undefined = logs.toString();
        try {
          logsStr = atob(logsStr as string);
        } catch (_) {
          logsStr = undefined;
        }
        if (logsStr) {
          if (logsStr.indexOf('\n') > -1) {
            append(`RUN: server logs\n${logsStr}`);
          } else {
            append(`RUN: ${logsStr}`);
          }
        }
      }
    }
  });

  function append(line: string) {
    const annotatedLine = `[${new Date().toLocaleTimeString()}] ${line}\n`;
    let newContent = contentElement.textContent + annotatedLine;
    if (newContent.length > effectiveOptions.maxSize) {
      newContent = newContent.substring(newContent.length - effectiveOptions.maxSize);
    }
    contentElement.textContent = newContent;
    setTimeout(() => (containerElement.scrollTop = containerElement.scrollHeight), 100);
  }

  editorContext.attachServerLogs();
}
