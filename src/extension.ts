import * as vscode from 'vscode';

// 当你的扩展被激活时调用此方法
export function activate(context: vscode.ExtensionContext) {
    console.log('恭喜，你的扩展 "swanlab" 现在已激活！');

    // 注册打开 SwanLab 的命令面板（带选项）
    const disposable = vscode.commands.registerCommand('swanlab.openWebview', async () => {
        // 向用户呈现选项
        const option = await vscode.window.showQuickPick(['打开云端 SwanLab', '打开本地 SwanLab'], {
            placeHolder: '选择如何启动 SwanLab'
        });

        if (option === '打开本地 SwanLab') {
            // 打开一个对话框，让用户选择 SwanLab 日志目录
            const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,  // 不能选择文件
                canSelectFolders: true, // 可以选择文件夹
                canSelectMany: false,  // 不能选择多个文件夹
                openLabel: '选择 SwanLab 日志目录'
            });

            if (selectedFolder && selectedFolder[0]) {
                openLocalSwanLab(context, selectedFolder[0].fsPath);
            }
        } else if (option === '打开云端 SwanLab') {
            // 打开云端 SwanLab 网页
            openSwanLabWebsite(context);
        }
    });
    // 将命令添加到上下文订阅中
    context.subscriptions.push(disposable);

    // 注册代码操作提供程序
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: 'file', language: 'python' },
        new SwanLabCodeActionProvider()
    );
    // 将代码操作提供程序添加到上下文订阅中
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
        'SwanLab 网站',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent('https://swanlab.cn');

    // 处理来自 webview 的消息
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
        vscode.window.showErrorMessage('未选择有效的 SwanLab 日志目录。');
        return;
    }
    
    const terminal = vscode.window.createTerminal('SwanLab');
    terminal.sendText(`swanlab watch "${logPath}" -p 50092`);
    terminal.show();

    vscode.window.showInformationMessage(`正在启动 SwanLab，日志路径：${logPath}`);

    // 等待后端服务启动
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 5 秒

    vscode.window.showInformationMessage(`SwanLab 后端服务已就绪。正在打开界面...`);

    // 在 VSCode 中打开一个新标签页，显示 SwanLab 界面
    const panel = vscode.window.createWebviewPanel(
        'swanlabLocal',
        '本地 SwanLab',
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

                // 初始化为 90% 缩放
                changeZoom(0.9);
            </script>
        </body>
        </html>
    `;
}

// 当你的扩展被停用时调用此方法
export function deactivate() {}
