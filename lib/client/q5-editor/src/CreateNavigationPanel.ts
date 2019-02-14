import { Workspace } from './Workspace';
import { INavigationPanelOptions, NavigationPanelOptions } from './Options';
import * as Events from './Events';

import 'jqtree';
import './jqtree.css';

enum NodeIds {
  Settings = 101,
  SettingsCompute = 102,
  SettingsApplication = 103,
  Tools = 201,
  ToolsRunner = 202,
  CodeAdd = 1001,
  Code = 1002,
}

export function createNavigationPanel(element: HTMLElement, workspace: Workspace, options?: INavigationPanelOptions) {
  let defaultOptions = new NavigationPanelOptions();
  let effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  let idPrefix = `q5-nav-${Math.floor(99999999 * Math.random()).toString(26)}`;
  let addButtonId = `${idPrefix}-add-file`;
  let removeButtonId = `${idPrefix}-remove-file`;
  let codeActionsId = `${idPrefix}-code-actions`;
  let newFileId = `${idPrefix}-new-file`;
  let deleteFileConfirmId = `${idPrefix}-delete-file`;
  let confirmDeleteButtonId = `${idPrefix}-delete-file-confirm`;
  let cancelDeleteButtonId = `${idPrefix}-delete-file-cancel`;
  let newFileNameId = `${idPrefix}-new-file-name`;
  $(element).html(`<div id="${idPrefix}-main" class="q5-nav"></div>`);
  let $nav = $(`#${idPrefix}-main`);

  let addingNewFile: boolean = false;
  let deletingFile: boolean = false;
  var fileNo = NodeIds.Code + 1;

  let data: any[] = [];

  if (!effectiveOptions.hideCode) {
    let code = {
      name: 'Code',
      id: NodeIds.Code,
      children: <{ name: string; fileName?: string; id: number }[]>[],
    };
    if (workspace.functionSpecification && workspace.functionSpecification.nodejs) {
      let fileNames = Object.keys(workspace.functionSpecification.nodejs.files).sort();
      for (var i = 0; i < fileNames.length; i++) {
        let fileName = fileNames[i];
        if ((<string[]>effectiveOptions.hideFiles).indexOf(fileName) < 0) {
          let child = { name: fileName, fileName, id: fileNo++ };
          code.children.push(child);
        }
      }
    }
    code.children.push({ name: 'Add', id: NodeIds.CodeAdd });
    data.push(code);
  }
  if (!effectiveOptions.hideComputeSettings || !effectiveOptions.hideApplicationSettings) {
    let settings: any = {
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
    data.push(settings);
  }
  if (!effectiveOptions.hideRunnerTool) {
    let tools = {
      name: 'Tools',
      id: NodeIds.Tools,
      children: [{ name: 'Runner', id: NodeIds.ToolsRunner }],
    };
    data.push(tools);
  }

  let result = $nav
    .tree({
      data,
      closedIcon: $('<i class="fa fa-chevron-right" aria-hidden="true"></i>').get(0),
      openedIcon: $('<i class="fa fa-chevron-down" aria-hidden="true"></i>').get(0),
      autoOpen: true,
      dragAndDrop: true,
      onCreateLi: (node, $li) => {
        if (node.id === NodeIds.Code) {
          let lines = [
            `Code<button id="${addButtonId}" class="q5-code-action-add-btn"><i class="fa fa-plus"></i></button>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id > NodeIds.Code) {
          let lines = [
            `<span class="q5-code-file-icon"><i class="fa fa-file"></i></span>`,
            `<span id="codefile-${node.id}"class="q5-code-file">${node.fileName}</span>`,
            `<button id="${removeButtonId}-${
              node.id
            }" class="q5-code-action-delete-btn"><i class="fa fa-trash"></i></button>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.ToolsRunner) {
          let lines = [
            `<span class="q5-code-cogs-icon"><i class="fa fa-cogs"></i></span>`,
            `<span class="q5-runner-file">Runner</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.SettingsApplication) {
          let lines = [
            `<span class="q5-code-secret-icon"><i class="fa fa-user-secret"></i></span>`,
            `<span class="q5-application-file">Application</span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        } else if (node.id === NodeIds.CodeAdd) {
          let lines = [
            `<span id="${newFileId}" style="display:none"><span class="q5-code-file-icon"><i class="fa fa-file"></i></span><input id="${newFileNameId}" placeholder="newFile.js" size="15" class="q5-new-file-input"></span>`,
          ];
          $li.find('.jqtree-element span').html(lines.join(''));
        }

        // if (node.id === NodeIds.CodeAddRemove) {
        //   let lines = [
        //     `<span id="${deleteFileConfirmId}" style="display:none" class="q5-delete-file-confirm">Delete?&nbsp;<button id="${confirmDeleteButtonId}" class="q5-code-action-btn"><i class="far fa-check-circle"></i></button>`,
        //     `<button id="${cancelDeleteButtonId}" class="q5-code-action-btn"><i class="far fa-times-circle"></i></button></span>`,
        //     `<span id="${newFileId}" style="display:none"><input id="${newFileNameId}" placeholder="newFile.js" size="15" class="q5-new-file-input"></span>`,
        //     `<span id="${codeActionsId}"><button id="${addButtonId}" class="q5-code-action-btn"><i class="far fa-plus-square"></i></button>`,
        //     `<button id="${removeButtonId}" class="q5-code-action-btn"><i class="far fa-minus-square"></i></button></span>`,
        //   ];
        //   $li.find('.jqtree-element span').html(lines.join(''));
        // }
      },
      onCanSelectNode: node => {
        return [NodeIds.Settings, NodeIds.Tools, NodeIds.Code].indexOf(<number>node.id) < 0;
      },
    })
    .on('tree.select', function(event: any) {
      if (event.node) {
        // if (addingNewFile) {
        //   endAddingNewFile();
        // }
        // if (deletingFile) {
        //   endDeletingFile(false);
        // }
        switch (event.node.id) {
          case NodeIds.SettingsApplication:
            workspace.selectSettingsApplication();
            break;
          case NodeIds.SettingsCompute:
            workspace.selectSettingsCompute();
            break;
          case NodeIds.ToolsRunner:
            workspace.selectToolsRunner();
            break;
          default:
            // A file was selected
            workspace.selectFile(event.node.fileName);
        }
      }
    });

  // Add event listeners to add/remove file controls
  attachFileManipulationEvents();

  workspace.on(Events.Events.FileAdded, (e: Events.FileAddedEvent) => {
    let fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    let largerNode: INode = <INode>$nav.tree('getNodeById', NodeIds.CodeAdd);
    for (var i = 0; i < fileNodes.length; i++) {
      if (fileNodes[i].fileName > e.fileName) {
        largerNode = fileNodes[i];
        break;
      }
    }
    $nav.tree('addNodeBefore', { name: e.fileName, fileName: e.fileName, id: fileNo++ }, largerNode);
    let newNode = $nav.tree('getNodeById', fileNo - 1);
    $nav.tree('selectNode', newNode);
    attachFileManipulationEvents(); // jqTree re-generates the DOM, so we need to re-attach events
  });

  workspace.on(Events.Events.FileDeleted, (e: Events.FileDeletedEvent) => {
    let fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    let node: INode | undefined = undefined;
    for (var i = 0; i < fileNodes.length; i++) {
      if (fileNodes[i].fileName === e.fileName) {
        node = fileNodes[i];
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
    addingNewFile = false;
    let $codeActions = $(`#${codeActionsId}`);
    let $newFile = $(`#${newFileId}`);
    $newFile.hide();
    $codeActions.show();
    if (fileName) {
      if (workspace.functionSpecification.nodejs && workspace.functionSpecification.nodejs.files[fileName]) {
        // file exists, select it
        let fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
        for (var i = 0; i < fileNodes.length; i++) {
          if (fileNodes[i].fileName === fileName) {
            $nav.tree('selectNode', fileNodes[i]);
          }
        }
      } else {
        workspace.addFile(fileName);
      }
    }
  }

  function endDeletingFile(confirm: boolean, fileName: string) {
    deletingFile = false;
    let $codeActions = $(`#${codeActionsId}`);
    $codeActions.show();
    if (confirm) {
      workspace.deleteFile(fileName);
    }
  }

  function attachFileManipulationEvents() {
    let $addButton = $(`#${addButtonId}`);
    let $confirmDeleteButton = $(`#${confirmDeleteButtonId}`);
    let $cancelDeleteButton = $(`#${cancelDeleteButtonId}`);
    let $newFileName = $(`#${newFileNameId}`);
    let $codeActions = $(`#${codeActionsId}`);
    let $newFile = $(`#${newFileId}`);

    $addButton.click(e => {
      e.preventDefault();
      addingNewFile = true;
      $codeActions.hide();
      $newFile.show();
      $newFileName.val('').focus();
    });

    let fileNodes = ($nav.tree('getNodeById', NodeIds.Code) || { children: [] }).children || [];
    for (var i = 0; i < fileNodes.length; i++) {
      const nodeId = fileNodes[i].id;
      const fileName = fileNodes[i].fileName;
      $(`#${removeButtonId}-${nodeId}`).click(e => {
        e.preventDefault();
        deletingFile = true;
        $codeActions.hide();
        endDeletingFile(true, fileName);
      });
    }

    $newFileName.keyup(e => {
      if (e.which == 13 || e.keyCode == 13) {
        // enter
        endAddingNewFile(<string>$newFileName.val());
      } else if (e.which == 27 || e.keyCode == 27) {
        // escape
        endAddingNewFile();
      }
    });

    // $confirmDeleteButton.click(e => {
    //   e.preventDefault();
    //   endDeletingFile(true);
    // });

    // $cancelDeleteButton.click(e => {
    //   e.preventDefault();
    //   endDeletingFile(false);
    // });
  }

  return result;
}
