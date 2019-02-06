import { Workspace } from './Workspace';
import * as Events from './Events';
import { INavigationPanelOptions, NavigationPanelOptions } from './Options';

import 'jqtree';
import './jqtree.css';

enum NodeIds {
    Settings = 101,
    SettingsCompute = 102,
    SettingsApplication = 103,
    Tools = 201,
    ToolsRunner = 202,
    Code = 1001
}

export function createNavigationPanel (element: HTMLElement, workspace: Workspace, options?: INavigationPanelOptions) {
    let id = `q5-nav-${Math.floor(99999999 * Math.random()).toString(26)}`;
    $(element).html(`<div id="${id}" class="q5-nav"></div>`);
    let $nav = $(`#${id}`);

    let code = {
        name: "Code", id: NodeIds.Code,
        children: <{name: string, fileName: string, id: number}[]>[]
    };
    if (workspace.functionSpecification && workspace.functionSpecification.nodejs) {
        var fileNo = NodeIds.Code + 1;
        for (var fileName in workspace.functionSpecification.nodejs.files) {
            let child = { name: fileName, fileName, id: fileNo++ };
            if (!code.children) {
                code.children = [ child ];
            }
            else {
                code.children.push(child);
            }
        }
    }
    let settings = {
        name: 'Settings', id: NodeIds.Settings,
        children: [
            { name: 'Compute', id: NodeIds.SettingsCompute },
            { name: 'Application', id: NodeIds.SettingsApplication }
        ]
    };
    let tools = {
        name: 'Tools', id: NodeIds.Tools,
        children: [
            { name: 'Runner', id: NodeIds.ToolsRunner },
        ]
    };
    
    var data = [ code, settings, tools ];

    return $nav.tree({
        data: data,
        autoOpen: true,
        dragAndDrop: true,
    }).on('tree.select', function (event: any) {
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
    })
}
