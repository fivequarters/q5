import { Workspace } from './Workspace';
import * as Events from './Events';
import { ILogsPanelOptions, LogsPanelOptions } from './Options';

export function createLogsPanel(element: HTMLElement, workspace: Workspace, options?: ILogsPanelOptions) {
  let id = `q5-logs-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(`<div class="q5-logs" id="${id}"><pre class="q5-logs-content" id="${id}-content"></pre></div>`);
  let $content = $(`#${id}-content`);
  let $container = $(`#${id}`);

  let defaultOptions = new LogsPanelOptions();
  let effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  workspace.on(Events.Events.BuildStarted, function(e: Events.BuildStartedEvent) {
    append(
      `BUILD: starting build of ${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}...`
    );
  });

  workspace.on(Events.Events.BuildProgress, function(e: Events.BuildProgressEvent) {
    append(`BUILD ${e.status.build_id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status})`);
  });

  workspace.on(Events.Events.BuildFinished, function(e: Events.BuildFinishedEvent) {
    if (e.status.build_id)
      append(
        `BUILD ${e.status.build_id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status}) ${e
          .status.url || JSON.stringify(e.status.error, null, 2)}`
      );
    else append(`BUILD: success (no changes) ${e.status.url || JSON.stringify(e.status.error, null, 2)}`);
  });

  workspace.on(Events.Events.BuildError, function(e: Events.BuildErrorEvent) {
    append(`BUILD: error ${e.error}`);
  });

  workspace.on(Events.Events.RunnerStarted, function(e: Events.RunnerStartedEvent) {
    append(`RUN: calling ${e.url}`);
  });

  workspace.on(Events.Events.RunnerFinished, function(e: Events.RunnerFinishedEvent) {
    let response = e.response;
    if (e.error) {
      response = response || (<any>e.error).response;
      if (!response) {
        return append(`RUN: error ${(<any>e.error).stack || e.error}`);
      }
    }
    if (!response) return;
    let lines: string[] = [`RUN: received response HTTP ${response.statusCode} ${response.statusMessage}`];
    // @ts-ignore
    for (var h in response.headers) {
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
    let logs = response.headers['x-fx-logs'];
    if (logs) {
      let logsStr: string | undefined = logs.toString();
      try {
        logsStr = atob(<string>logsStr);
      } catch (_) {
        logsStr = undefined;
      }
      if (logsStr) {
        append(`RUN: server logs\n${logsStr}`);
      }
    }
  });

  function append(line: string) {
    let annotatedLine = `[${new Date().toLocaleTimeString()}] ${line}\n`;
    let newContent = $content.text() + annotatedLine;
    if (newContent.length > effectiveOptions.maxSize) {
      newContent = newContent.substring(newContent.length - effectiveOptions.maxSize);
    }
    $content.text(newContent);
    setTimeout(() => ($container[0].scrollTop = $container[0].scrollHeight), 100);
  }
}
