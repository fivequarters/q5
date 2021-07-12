import * as Model from '@fusebit/schema';

import { createActionPanel } from './CreateActionPanel';
import { createEditorPanel } from './CreateEditorPanel';
import { createLogsPanel } from './CreateLogsPanel';
import { createNavigationPanel } from './CreateNavigationPanel';
import { createStatusPanel } from './CreateStatusPanel';
import * as Events from './Events';
import * as Options from './Options';
import { IEditorOptions } from './Options';
import { Server, IAccount, AccountResolver } from './Server';
import { FunctionServer } from './FunctionServer';
import { EntityServer } from './EntityServer';
import { EditorContext } from './EditorContext';
import { IFunctionSpecification } from './FunctionSpecification';
import { resizable, height, width } from './Resizable';

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

	/**
	 * The type of object being edited.
	 */
	entityType?: Model.EntityType;
}

/**
 * Loads or creates a function and initializes the function editor within the specified HTML element.
 * If the specified function does not exist but _options.template_ is specified, a new function is created using this template.
 * On successful intialization of the editor, [[EditorContext]] is returned which can be used to subscribe to events and manipulate the editor.
 * used to subscribe to events and manipulate the editor.
 * @param element The HTML element (typically a div) within which to create the function editor.
 * @param boundaryId The boundaryId of the function.
 * @param functionId The function name.
 * @param account Account information to use when calling Fusebit HTTP APIs.
 * @param options Editor creation options.
 */
export async function createEditor(
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

	let server: Server;

	if (options && options.entityType) {
		server =
			typeof account === 'function'
				? new EntityServer(options.entityType, account as AccountResolver)
				: await EntityServer.create(options.entityType, account as IAccount);
	} else {
		server =
			typeof account === 'function'
				? new FunctionServer(account as AccountResolver)
				: FunctionServer.create(account as IAccount);
	}

	return server.loadEditorContext(boundaryId, functionId, options).then((editorContext: EditorContext) => {
		createEditorImpl(editorContext);
		let selectedFile = editorContext.selectedFileName;
		editorContext.selectedFileName = undefined;
		if (selectedFile) {
			editorContext.selectFile(selectedFile);
		}
		return editorContext;
	});

	function createEditorImpl(editorContext: EditorContext) {
		let opts = editorContext.getMetadata().editor;
		if (opts.navigationPanel === false && opts.logsPanel === false && opts.actionPanel !== false) {
			(opts.actionPanel as Options.IActionPanelOptions).enableCodeOnlyToggle = false;
		}

		const idPrefix = `fusebit-${Math.floor(99999999 * Math.random()).toString(26)}`;
		const actionId = `${idPrefix}-action`;
		const navEditorContainerId = `${idPrefix}-nav-editor-container`;
		const navId = `${idPrefix}-nav`;
		const navSplitterId = `${idPrefix}-nav-splitter`;
		const editorId = `${idPrefix}-editor`;
		const logsId = `${idPrefix}-logs`;
		const logsSplitterId = `${idPrefix}-logs-splitter`;
		const statusId = `${idPrefix}-status`;

		const lines: string[] = [
			`<div id="${idPrefix}" class="fusebit-theme-${
				opts.theme || 'light'
			} fusebit-shell"><div id="${idPrefix}-main" class="fusebit-main${
				opts.statusPanel === false ? ' fusebit-main-no-status' : ''
			}">`,
		];
		if (opts.actionPanel !== false) {
			lines.push(`<div id="${actionId}" class="fusebit-action-container" tabindex="-1"></div>`);
		}
		if (opts.navigationPanel !== false) {
			lines.push(`<div class="fusebit-nav-container" id="${navId}" tabindex="-1"></div>`);
		}
		if (opts.navigationPanel !== false && (opts.editorPanel !== false || opts.logsPanel !== false)) {
			lines.push(`<div class="fusebit-nav-splitter" id="${navSplitterId}" tabindex="-1"></div>`);
		}
		if (opts.editorPanel !== false || opts.logsPanel !== false) {
			lines.push(`<div class="fusebit-nav-editor-container" id="${navEditorContainerId}" tabindex="-1">`);
			if (opts.editorPanel !== false) {
				lines.push(`<div class="fusebit-editor-container" id="${editorId}"></div>`);
			}
			if (opts.editorPanel !== false && opts.logsPanel !== false) {
				lines.push(`<div class="fusebit-logs-splitter" id="${logsSplitterId}"></div>`);
			}
			if (opts.logsPanel !== false) {
				lines.push(`<div class="fusebit-logs-container" id="${logsId}"></div>`);
			}
			lines.push('</div>');
		}
		lines.push('</div>');
		if (opts.statusPanel !== false) {
			lines.push(`<div class="fusebit-status-container" id="${statusId}" tabindex="-1"></div>`);
		}
		lines.push('</div>');

		element.innerHTML = lines.join('');

		const mainElement = document.getElementById(idPrefix) as HTMLElement;
		const navElement = document.getElementById(navId) as HTMLElement;
		const logsElement = document.getElementById(logsId) as HTMLElement;
		const editorElement = document.getElementById(editorId) as HTMLElement;
		const navEditorContainerElement = document.getElementById(navEditorContainerId) as HTMLElement;
		const logsSplitterElement = document.getElementById(logsSplitterId) as HTMLElement;
		const navSplitterElement = document.getElementById(navSplitterId) as HTMLElement;

		if (navSplitterElement) {
			// Keep editorMinWidth in sync with min-width of .fusebit-editor-container class
			const editorMinWidth = 100;
			resizable(navElement, navSplitterElement, {
				resizeHeight: false,
				// @ts-ignore
				onDrag(e, element, newWidth, newHeight, opt) {
					if ((width(editorElement) || 0) - (newWidth - width(element)) < editorMinWidth) {
						return false;
					}
					return true;
				},
			});
		}
		if (logsSplitterElement) {
			// Keep navEditorMinHeight in sync with min-height of .fusebit-nav-editor-container class
			const navEditorMinHeight = 100;
			resizable(logsElement, logsSplitterElement, {
				resizeWidth: false,
				resizeHeightFrom: 'top',
				// @ts-ignore
				onDrag(e, element, newWidth, newHeight, opt) {
					if ((height(navEditorContainerElement) || 0) - (newHeight - height(element)) < navEditorMinHeight) {
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
				opts.navigationPanel as Options.INavigationPanelOptions,
				document.getElementById(idPrefix) as HTMLElement
			);
		}
		if (opts.actionPanel !== false) {
			createActionPanel(
				document.getElementById(actionId) as HTMLElement,
				editorContext,
				opts.actionPanel as Options.IActionPanelOptions
			);
		}
		if (opts.logsPanel !== false) {
			createLogsPanel(
				document.getElementById(logsId) as HTMLElement,
				editorContext,
				opts.logsPanel as Options.ILogsPanelOptions
			);
		}

		mainElement.addEventListener('keydown', function (e: KeyboardEvent) {
			// Ctrl-S (Windows) or Command-S (Mac)
			if ((window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
				e.preventDefault();
				if (editorContext.dirtyState) {
					server.saveFunction(editorContext).catch((_) => {});
				}
			}
		});

		editorContext.on(Events.Events.LogsStateChanged, (e: Events.LogsStateChangedEvent) => {
			if (e.newState) {
				logsElement.style.display = 'unset';
				if (logsSplitterElement) {
					logsSplitterElement.style.display = 'unset';
				}
			} else {
				logsElement.style.display = 'none';
				if (logsSplitterElement) {
					logsSplitterElement.style.display = 'none';
				}
			}
		});

		editorContext.on(Events.Events.NavStateChanged, (e: Events.NavStateChangedEvent) => {
			if (e.newState) {
				navElement.style.display = 'unset';
				if (navSplitterElement) {
					navSplitterElement.style.display = 'unset';
				}
			} else {
				navElement.style.display = 'none';
				if (navSplitterElement) {
					navSplitterElement.style.display = 'none';
				}
			}
		});

		editorContext.on(Events.Events.FullScreenChanged, (e: Events.FullScreenChangedEvent) => {
			if (e.newState) {
				// expand
				mainElement.classList.add('fusebit-fullscreen');
			} else {
				// collapse
				mainElement.classList.remove('fusebit-fullscreen');
			}
		});
	}
}
