import { Workspace } from './Workspace';
import { INavigationPanelOptions, NavigationPanelOptions } from './Options';

import 'jqtree';
import './jqtree.css';

enum NodeIds {
  Settings = 101,
  SettingsCompute = 102,
  SettingsApplication = 103,
  Tools = 201,
  ToolsRunner = 202,
  Code = 1001,
}

export function createNavigationPanel(element: HTMLElement, workspace: Workspace, options?: INavigationPanelOptions) {
  let defaultOptions = new NavigationPanelOptions();
  let effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  let id = `q5-nav-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(`<div id="${id}" class="q5-nav"></div>`);
  let $nav = $(`#${id}`);

  let data: any[] = [];

  if (!effectiveOptions.hideCode) {
    let code = {
      name: 'Code',
      id: NodeIds.Code,
      children: <{ name: string; fileName: string; id: number }[]>[],
    };
    if (workspace.functionSpecification && workspace.functionSpecification.nodejs) {
      var fileNo = NodeIds.Code + 1;
      for (var fileName in workspace.functionSpecification.nodejs.files) {
        if ((<string[]>effectiveOptions.hideFiles).indexOf(fileName) < 0) {
          let child = { name: fileName, fileName, id: fileNo++ };
          if (!code.children) {
            code.children = [child];
          } else {
            code.children.push(child);
          }
        }
      }
    }
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

  return $nav
    .tree({
      data,
      autoOpen: true,
      dragAndDrop: true,
    })
    .on('tree.select', function(event: any) {
      if (event.node) {
        switch (event.node.id) {
          case NodeIds.Settings:
          case NodeIds.Tools:
          case NodeIds.Code:
            break; // "folder" level - ignore
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
}
