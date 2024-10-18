import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "swanlab" is now active!');

    // Register the command to open SwanLab with options
    const disposable = vscode.commands.registerCommand('swanlab.openWebview', async () => {
        // Present options to the user
        const option = await vscode.window.showQuickPick(['Open Cloud SwanLab', 'Open Local SwanLab'], {
            placeHolder: 'Choose how to launch SwanLab'
        });

        if (option === 'Open Local SwanLab') {
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select SwanLab Log Directory'
            });

            if (selectedFolder && selectedFolder[0]) {
                openLocalSwanLab(context, selectedFolder[0].fsPath);
            }
        } else if (option === 'Open Cloud SwanLab') {
            // Handle opening Cloud SwanLab
            // You might want to implement this function
            openSwanLabWebsite(context);
        }
    });

    context.subscriptions.push(disposable);

    // 注册代码操作提供程序
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: 'file', language: 'python' },
        new SwanLabCodeActionProvider()
    );
    context.subscriptions.push(codeActionProvider);
}

// SwanLab代码操作提供程序类
class SwanLabCodeActionProvider implements vscode.CodeActionProvider {
    // 提供代码操作的方法
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
        // 获取当前行的文本
        const lineText = document.lineAt(range.start.line).text;
        // 如果当前行包含'import swanlab'
        if (lineText.includes('import swanlab')) {
            // 创建一个新的代码操作
            const action = new vscode.CodeAction('启动 SwanLab', vscode.CodeActionKind.QuickFix);
            // 设置代码操作的命令
            action.command = {
                command: 'swanlab.openWebview',
                title: '启动 SwanLab',
                tooltip: '打开 SwanLab 界面'
            };
            // 返回包含这个操作的数组
            return [action];
        }
        // 如果不包含'import swanlab'，返回空数组
        return [];
    }
}

function openSwanLabWebsite(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'swanlabWebview',
        'SwanLab Website',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent('https://swanlab.cn');

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        },
        undefined,
        context.subscriptions
    );
}

// 打开本地 SwanLab
async function openLocalSwanLab(context: vscode.ExtensionContext, logPath: string | undefined) {
    if (!logPath) {
        vscode.window.showErrorMessage('No valid directory selected for SwanLab logs.');
        return;
    }
    
    const terminal = vscode.window.createTerminal('SwanLab');
    terminal.sendText(`swanlab watch "${logPath}" -p 50092`);
    terminal.show();

    vscode.window.showInformationMessage(`Starting SwanLab with logs from: ${logPath}`);

    // Wait for the backend service to start
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 5 seconds

    vscode.window.showInformationMessage(`SwanLab backend service is ready. Opening interface...`);

    // Open a new tab in VSCode with the SwanLab interface
    const panel = vscode.window.createWebviewPanel(
        'swanlabLocal',
        'Local SwanLab',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent('http://127.0.0.1:50092');
}

// 获取 webview 内容
function getWebviewContent(url: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SwanLab</title>
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden;
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    transform: scale(0.9);
                    transform-origin: 0 0;
                }
            </style>
        </head>
        <body>
            <iframe src="${url}" onload="checkIframeLoaded()" style="width: 111.11%; height: 111.11%;"></iframe>
            <script>
                function checkIframeLoaded() {
                    const iframe = document.querySelector('iframe');
                    vscode.postMessage({
                        command: 'info',
                        text: "Loaded successfully",
                    });
                }
                // Declare vscode for TypeScript
                const vscode = acquireVsCodeApi();
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
