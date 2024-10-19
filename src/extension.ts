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
                #header {
                    background-color: #333;
                    color: #fff;
                    padding: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: height 0.3s, padding 0.3s;
                    overflow: hidden;
                    height: 0;
                    padding: 0;
                }
                #header.expanded {
                    height: auto;
                    padding: 5px;
                }
                #content {
                    height: 100%;
                    transition: height 0.3s;
                }
                #content.partial {
                    height: calc(100% - 30px);
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    transform-origin: 0 0;
                }
                button {
                    margin-left: 5px;
                    font-size: 12px;
                    padding: 2px 5px;
                    cursor: pointer;
                    background-color: #555;
                    color: #fff;
                    border: none;
                    border-radius: 3px;
                }
                #toggleHeader {
                    background-color: rgba(255, 255, 255, 0.1);
                    border: none;
                    padding: 5px;
                    border-radius: 3px;
                    position: fixed;
                    top: 5px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    transition: background-color 0.3s, color 0.3s;
                    color: rgba(255, 255, 255, 0.5);
                }
                #toggleHeader:hover {
                    background-color: rgba(255, 255, 255, 0.4);
                    color: rgba(255, 255, 255, 1);
                }
                #toggleHeader.expanded {
                    color: rgba(255, 255, 255, 0.7);
                }
                #toggleHeader.expanded:hover {
                    color: rgba(255, 255, 255, 1);
                }
            </style>
        </head>
        <body>
            <button id="toggleHeader" onclick="toggleHeader()" title="Toggle Header">Show Header</button>
            <div id="header">
                <div></div>
                <div>
                    <button onclick="zoomOut()" title="Zoom Out">-</button>
                    <button onclick="zoomIn()" title="Zoom In">+</button>
                    <button onclick="refreshIframe()" title="Refresh">↻</button>
                </div>
            </div>
            <div id="content">
                <iframe src="${url}" onload="checkIframeLoaded()" id="swanlab-iframe"></iframe>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const iframe = document.getElementById('swanlab-iframe');
                const header = document.getElementById('header');
                const content = document.getElementById('content');
                const toggleButton = document.getElementById('toggleHeader');
                let currentZoom = 0.9;
                let isHeaderExpanded = false;

                function checkIframeLoaded() {
                    vscode.postMessage({
                        command: 'info',
                        text: "Loaded successfully",        
                    });
                }

                function changeZoom(zoomLevel) {
                    currentZoom = zoomLevel;
                    iframe.style.transform = \`scale(\${zoomLevel})\`;
                    iframe.style.width = \`\${100 / zoomLevel}%\`;
                    iframe.style.height = \`\${100 / zoomLevel}%\`;
                }

                function zoomIn() {
                    changeZoom(currentZoom * 1.1);
                }

                function zoomOut() {
                    changeZoom(currentZoom * 0.9);
                }

                function refreshIframe() {
                    iframe.src = iframe.src;
                }

                function toggleHeader() {
                    isHeaderExpanded = !isHeaderExpanded;
                    header.classList.toggle('expanded', isHeaderExpanded);
                    content.classList.toggle('partial', isHeaderExpanded);
                    toggleButton.classList.toggle('expanded', isHeaderExpanded);
                    toggleButton.textContent = isHeaderExpanded ? 'Hide Header' : 'Show Header';
                }

                // Initialize with 90% zoom
                changeZoom(0.9);
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
