import * as Assert from 'assert';
import * as Events from './Events';
import { IStatusPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createStatusPanel(element: HTMLElement, editorContext: EditorContext, options?: IStatusPanelOptions) {
  const id = `fusebit-status-${Math.floor(99999999 * Math.random()).toString(26)}`;
  element.innerHTML = `<div id="${id}" class="fusebit-status">Powered by Fusebit.io</div>`;
  const statusElement = document.getElementById(id) as HTMLElement;

  editorContext.on(Events.Events.BuildStarted, (e: Events.BuildStartedEvent) => {
    setStatus(`Starting build of ${editorContext.boundaryId}/${editorContext.functionId}...`);
  });

  editorContext.on(Events.Events.BuildProgress, (e: Events.BuildProgressEvent) => {
    setStatus(`Building ${Math.floor((e.status.progress || 0) * 100)}%...`);
  });

  editorContext.on(Events.Events.BuildFinished, (e: Events.BuildFinishedEvent) => {
    if (e.status.location) {
      setStatus(`Build successful: ${e.status.location}`);
    } else {
      setStatus(`Build failed: ${e.status.error}`);
    }
  });

  editorContext.on(Events.Events.BuildError, (e: Events.BuildErrorEvent) => {
    setStatus(`Build failed: ${e.error}`);
  });

  editorContext.on(Events.Events.RunnerStarted, (e: Events.RunnerStartedEvent) => {
    setStatus(`Running ${e.url}...`);
  });

  editorContext.on(Events.Events.RunnerFinished, (e: Events.RunnerFinishedEvent) => {
    if (e.error) {
      setStatus(`Run error: ${e.error}`);
    } else if (e.response) {
      setStatus(`Run finished: HTTP ${e.response.statusCode}. Check logs for details.`);
    } else {
      Assert.fail('RunnerFinishedEvent has no response or error.');
    }
  });

  function setStatus(line: string) {
    statusElement.innerText = line;
  }
}
