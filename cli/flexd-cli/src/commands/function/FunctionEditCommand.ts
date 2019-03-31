import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from '../../services';
import * as http from 'http';
import { IFlexdExecutionProfile } from 'lib/server/flexd-profile/libc';
const open = require('open');

export class FunctionEditCommand extends Command {
  private constructor() {
    super({
      name: 'Edit Function',
      cmd: 'edit',
      summary: 'Edit a function in the Flexd Editor',
      description: `Opens the Flexd Editor in your default browser to edit a function. If the function does 
not exit, it is created.

If the profile does not specify the subscription, boundary, or function, the relevant 
command options are required.`,
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to edit.',
        },
      ],
    });
  }

  public static async create() {
    return new FunctionEditCommand();
  }

  attempts: number = 0;

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription', 'boundary', 'function']);
    if (!profile) {
      return 1;
    }

    let port = 8000 + Math.floor(Math.random() * 100);
    let editorHtml = getEditorHtml(port, profile);
    return new Promise((resolve, reject) => {
      http
        .createServer((req, res) => {
          if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(editorHtml);
          } else {
            res.writeHead(404);
            return res.end();
          }
        })
        .listen(port, (e: any) => {
          if (e) {
            this.attempts++;
            if (this.attempts > 10) {
              return reject(
                new Error('Unable to find a free port in the 80xx range to host a local service. Try again.')
              );
            } else {
              return this.onExecute(input);
            }
          }
          console.log(
            // @ts-ignore
            `Hosting the function editor for function ${profile.boundary}/${
              // @ts-ignore
              profile.function
            } at http://127.0.0.1:${port}.\nIf the browser does not open automatically, navigate to this URL.\n\nCtrl-C to terminate...`
          );
          open(`http://127.0.0.1:${port}`);
        });
    });
  }
}

function getEditorHtml(port: number, profile: IFlexdExecutionProfile): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />

    <link rel="icon" type="image/png" sizes="32x32" href="https://flexd.io/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="https://flexd.io/favicon-16x16.png" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />

    <title>Flexd ${profile.function}</title>

    <meta content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' name='viewport' />
    <meta name="viewport" content="width=device-width" />

    <style>
        html,body {
            width: 100%;
            height: 100%;
        }
    </style>

</head>
<body>
    <div id="editor" style="width:800px;height:500px;margin-top:30px;margin-left:auto;margin-right:auto">
</body>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js" type="text/javascript"></script>
<script src="https://cdn.flexd.io/flexd/js/flexd-editor/latest/flexd-editor.js"></script>
<script type="text/javascript">
    $(function () {

        flexd.createEditor(document.getElementById('editor'), '${profile.boundary}', '${profile.function}', {
            subscriptionId: '${profile.subscription}',
            baseUrl: '${profile.baseUrl}',
            accessToken: '${profile.token}',
        }, {
            template: {},
            // editor: {},
        }).then(editorContext => {
            editorContext.setFullScreen(true);
        });

    });
</script>

</html>  
`;
}
