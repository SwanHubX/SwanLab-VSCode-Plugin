import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "swanlab" is now active!');

    const disposable = vscode.commands.registerCommand('swanlab.openWebview', () => {
        const panel = vscode.window.createWebviewPanel(
            'swanlabWebview',
            'SwanLab',
            vscode.ViewColumn.One,
            {
                enableScripts: true, // Enable JavaScript in the webview
                retainContextWhenHidden: true // Keep the webview in memory when it's not visible
            }
        );

        panel.webview.html = getWebviewContent();

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
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
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
                }
            </style>
        </head>
        <body>
            <iframe src="https://swanlab.cn" onload="checkIframeLoaded()"></iframe>
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
