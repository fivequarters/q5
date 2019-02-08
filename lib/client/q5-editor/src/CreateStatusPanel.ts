import { Workspace } from './Workspace';
import * as Events from './Events';
import { IStatusPanelOptions } from './Options';
import * as Assert from 'assert';

export function createStatusPanel(element: HTMLElement, workspace: Workspace, options?: IStatusPanelOptions) {
  let id = `q5-status-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(`<div id="${id}" class="q5-status">Status</div>`);
  let $status = $(`#${id}`);

  workspace.on(Events.Events.BuildStarted, function(e: Events.BuildStartedEvent) {
    setStatus(
      `Starting build of ${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}...`
    );
  });

  workspace.on(Events.Events.BuildProgress, function(e: Events.BuildProgressEvent) {
    setStatus(`Building ${Math.floor((e.status.progress || 0) * 100)}%...`);
  });

  workspace.on(Events.Events.BuildFinished, function(e: Events.BuildFinishedEvent) {
    if (e.status.url) {
      setStatus(`Build successful: ${e.status.url}`);
    } else {
      setStatus(`Build failed: ${e.status.error}`);
    }
  });

  workspace.on(Events.Events.BuildError, function(e: Events.BuildErrorEvent) {
    setStatus(`Build failed: ${e.error}`);
  });

  workspace.on(Events.Events.RunnerStarted, function(e: Events.RunnerStartedEvent) {
    setStatus(`Running ${e.url}...`);
  });

  workspace.on(Events.Events.RunnerFinished, function(e: Events.RunnerFinishedEvent) {
    if (e.error) {
      setStatus(`Run error: ${e.error}`);
    } else if (e.response) {
      setStatus(`Run finished: HTTP ${e.response.statusCode}. Check logs for details.`);
    } else {
      Assert.fail('RunnerFinishedEvent has no response or error.');
    }
  });

  function setStatus(line: string) {
    $status.text(line);
  }
}
