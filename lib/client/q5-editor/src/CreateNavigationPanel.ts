import * as Events from './Events';
import { INavigationPanelOptions, NavigationPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

import 'jqtree';
import './jqtree.css';

enum NodeIds {
  Settings = 101,
  SettingsCompute = 102,
  SettingsApplication = 103,
  SettingsCron = 104,
  Tools = 201,
  ToolsRunner = 202,
  CodeAdd = 1001,
  Code = 1002,
}

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createNavigationPanel(
  element: HTMLElement,
  editorContext: EditorContext,
  options?: INavigationPanelOptions
) {
  const defaultOptions = new NavigationPanelOptions();
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  const idPrefix = `q5-nav-${Math.floor(99999999 * Math.random()).toString(26)}`;
  const addButtonId = `${idPrefix}-add-file`;
  const removeButtonId = `${idPrefix}-remove-file`;
  const newFileId = `${idPrefix}-new-file`;
  const newFileNameId = `${idPrefix}-new-file-name`;
  $(element).html(`<div id="${idPrefix}-main" class="q5-nav"></div>`);
  const $nav = $(`#${idPrefix}-main`);

  let fileNo = NodeIds.Code + 1;

  const data: any[] = [];

  if (!effectiveOptions.hideCode) {
    const code = {
      name: 'Code',
      id: NodeIds.Code,
      children: [] as { name: string; fileName?: string; id: number }[],
    };
    if (editorContext.functionSpecification && editorContext.functionSpecification.nodejs) {
      const fileNames = Object.keys(editorContext.functionSpecification.nodejs.files).sort();
      for (const fileName of fileNames) {
        if ((effectiveOptions.hideFiles as string[]).indexOf(fileName) < 0) {
          const child = { name: fileName, fileName, id: fileNo++ };
          code.children.push(child);
        }
      }
    }
    code.children.push({ name: 'Add', id: NodeIds.CodeAdd });
    data.push(code);
  }
  if (
    !effectiveOptions.hideComputeSettings ||
    !effectiveOptions.hideApplicationSettings ||
    !effectiveOptions.hideCronSettings
  ) {
    const settings: any = {
      name: 'Settings',
      id: NodeIds.Settings,
      children: [],
    };
    if (!effectiveOptions.hideComputeSettings) {
      settings.children.push({ name: 'Compute', id: NodeIds.SettingsCompute });
    }
    if (!effectiveOptions.hideApplicationSettings) {
      settings.children.push({ name: 'Application', id: NodeIds.SettingsApplication });
    }
    if (!effectiveOptions.hideCronSettings) {
      settings.children.push({ name: 'Schedule', id: NodeIds.SettingsCron });
    }
    data.push(settings);
  }
  if (!effectiveOptions.hideRunnerTool) {
    const tools = {
      name: 'Tools',
      id: NodeIds.Tools,
      children: [{ name: 'Runner', id: NodeIds.ToolsRunner }],
    };
    data.push(tools);
  }

  const result = $nav
    .tree({
      data,
      closedIcon: $('<i class="fa fa-chevron-right" aria-hidden="true"></i>').get(0),
      openedIcon: $('<i class="fa fa-chevron-down" aria-hidden="true"></i>').get(0),
      autoOpen: true,
      dragAndDrop: true,
      onCreateLi: (node, $li) => {
        if (node.id === NodeIds.Code) {
          const lines = [
            `Code<button id="${addButtonId}" class="q5-code-action-add-btn"><i class="fa fa-plus"></i></button>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id > NodeIds.Code) {
          const lines = [
            `<span class="q5-code-file-icon"><i class="fa fa-file"></i></span>`,
            `<span id="codefile-${node.id}"class="q5-code-file">${node.fileName}</span>`,
            `<button id="${removeButtonId}-${
              node.id
            }" class="q5-code-action-delete-btn"><i class="fa fa-trash"></i></button>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.ToolsRunner) {
          const lines = [
            `<span class="q5-code-cogs-icon"><i class="fa fa-cogs"></i></span>`,
            `<span class="q5-runner-file">Runner</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.SettingsApplication) {
          const lines = [
            `<span class="q5-code-secret-icon"><i class="fa fa-user-secret"></i></span>`,
            `<span class="q5-application-file">Application</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.SettingsCron) {
          const lines = [
            `<span class="q5-code-cron-icon"><i class="fa fa-clock"></i></span>`,
            `<span class="q5-cron-file">Schedule</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.SettingsCompute) {
          const lines = [
            `<span class="q5-code-compute-icon"><i class="fa fa-tools"></i></span>`,
            `<span class="q5-compute-file">Compute</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.CodeAdd) {
          const lines = [
            `<span id="${newFileId}" style="display:none">`,
            `<span class="q5-code-file-icon">`,
            `<i class="fa fa-file"></i>`,
            `</span>`,
            `<input id="${newFileNameId}" placeholder="newFile.js" size="15" class="q5-new-file-input">`,
            `</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        }
      },
      onCanSelectNode: node => {
        return [NodeIds.CodeAdd, NodeIds.Settings, NodeIds.Tools, NodeIds.Code].indexOf(node.id as number) < 0;
      },
    })
    .on('tree.select', (event: any) => {
      if (event.node) {
        switch (event.node.id) {
          case NodeIds.SettingsApplication:
            editorContext.selectSettingsApplication();
            break;
          case NodeIds.SettingsCompute:
            editorContext.selectSettingsCompute();
            break;
          case NodeIds.SettingsCron:
            editorContext.selectSettingsCron();
            break;
          case NodeIds.ToolsRunner:
            editorContext.selectToolsRunner();
            break;
          default:
            // A file was selected
            editorContext.selectFile(event.node.fileName);
        }
      }
    });

  // Add event listeners to add/remove file controls
  attachFileManipulationEvents();

  editorContext.on(Events.Events.FileAdded, (e: Events.FileAddedEvent) => {
    const fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    let largerNode: INode = $nav.tree('getNodeById', NodeIds.CodeAdd) as INode;
    for (const fileNode of fileNodes) {
      if (fileNode.fileName > e.fileName) {
        largerNode = fileNode;
        break;
      }
    }
    $nav.tree('addNodeBefore', { name: e.fileName, fileName: e.fileName, id: fileNo++ }, largerNode);
    const newNode = $nav.tree('getNodeById', fileNo - 1);
    $nav.tree('selectNode', newNode);
    attachFileManipulationEvents(); // jqTree re-generates the DOM, so we need to re-attach events
  });

  editorContext.on(Events.Events.FileDeleted, (e: Events.FileDeletedEvent) => {
    let fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    let node: INode | undefined;
    for (const fileNode of fileNodes) {
      if (fileNode.fileName > e.fileName) {
        node = fileNode;
        break;
      }
    }
    if (node) {
      $nav.tree('removeNode', node);
    }
    fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    if (fileNodes.length > 0) {
      $nav.tree('selectNode', fileNodes[0]);
    }
    attachFileManipulationEvents(); // jqTree re-generates the DOM, so we need to re-attach events
  });

  function endAddingNewFile(fileName?: string) {
    const $newFile = $(`#${newFileId}`);
    $newFile.hide();
    if (fileName) {
      if (editorContext.functionSpecification.nodejs && editorContext.functionSpecification.nodejs.files[fileName]) {
        // file exists, select it
        const fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
        for (const fileNode of fileNodes) {
          if (fileNode.fileName === fileName) {
            $nav.tree('selectNode', fileNode);
          }
        }
      } else {
        editorContext.addFile(fileName);
      }
    }
  }

  function endDeletingFile(confirm: boolean, fileName: string) {
    if (confirm) {
      editorContext.deleteFile(fileName);
    }
  }

  function attachFileManipulationEvents() {
    const $addButton = $(`#${addButtonId}`);
    const $newFileName = $(`#${newFileNameId}`);
    const $newFile = $(`#${newFileId}`);

    $addButton.click(e => {
      e.preventDefault();
      $newFile.show();
      $newFileName.val('').focus();
    });

    const fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    for (const fileNode of fileNodes) {
      const nodeId = fileNode.id;
      const fileName = fileNode.fileName;
      $(`#${removeButtonId}-${nodeId}`).click(e => {
        e.preventDefault();
        endDeletingFile(true, fileName);
      });
    }

    $newFileName.keyup(e => {
      if (e.which === 13 || e.keyCode === 13) {
        // enter
        endAddingNewFile($newFileName.val() as string);
      } else if (e.which === 27 || e.keyCode === 27) {
        // escape
        endAddingNewFile();
      }
    });
  }

  return result;
}
