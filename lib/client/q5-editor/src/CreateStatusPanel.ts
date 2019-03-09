import * as Assert from 'assert';
import * as Events from './Events';
import { IStatusPanelOptions } from './Options';
import { Workspace } from './Workspace';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param workspace
 * @param options
 */
export function createStatusPanel(element: HTMLElement, workspace: Workspace, options?: IStatusPanelOptions) {
  const id = `q5-status-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(`<div id="${id}" class="q5-status">Status</div>`);
  const $status = $(`#${id}`);

  workspace.on(Events.Events.BuildStarted, (e: Events.BuildStartedEvent) => {
    setStatus(
      `Starting build of ${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}...`
    );
  });

  workspace.on(Events.Events.BuildProgress, (e: Events.BuildProgressEvent) => {
    setStatus(`Building ${Math.floor((e.status.progress || 0) * 100)}%...`);
  });

  workspace.on(Events.Events.BuildFinished, (e: Events.BuildFinishedEvent) => {
    if (e.status.url) {
      setStatus(`Build successful: ${e.status.url}`);
    } else {
      setStatus(`Build failed: ${e.status.error}`);
    }
  });

  workspace.on(Events.Events.BuildError, (e: Events.BuildErrorEvent) => {
    setStatus(`Build failed: ${e.error}`);
  });

  workspace.on(Events.Events.RunnerStarted, (e: Events.RunnerStartedEvent) => {
    setStatus(`Running ${e.url}...`);
  });

  workspace.on(Events.Events.RunnerFinished, (e: Events.RunnerFinishedEvent) => {
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
