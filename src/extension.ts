import * as vscode from 'vscode'
import { VFile } from 'vfile'
import { engine } from 'unified-engine'
import { createProcessor } from '@mdx-js/mdx'

const statusIcons = {
  ready: 'check-all',
  success: 'check',
  ignore: 'x',
  warn: 'warning',
  error: 'alert',
  disabled: 'circle-slash',
}

let outputChannel: vscode.OutputChannel
let diagnosticCollection: vscode.DiagnosticCollection
let statusBarItem: vscode.StatusBarItem

function log(message: string) {
  outputChannel.appendLine(message)
}

function setStatus(status: keyof typeof statusIcons) {
  statusBarItem.text = `$(${statusIcons[status]}) Remark`
}

export function activate(context: vscode.ExtensionContext): void {
  const lintDocumentId = 'remark-lint.lint-document'
  const lintDocument = vscode.commands.registerCommand(lintDocumentId, () => {
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      log('No active text editor found.')
      return
    }

    return lint(editor.document)
  })

  const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument((document) => {
    return lint(document)
  })
  const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
    return lint(document)
  })
  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) {
      return
    }

    return lint(editor.document)
  })

  outputChannel = vscode.window.createOutputChannel('Remark Lint')

  diagnosticCollection = vscode.languages.createDiagnosticCollection('remark-lint')

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1)
  statusBarItem.command = lintDocumentId
  setStatus('ready')
  statusBarItem.show()

  context.subscriptions.push(
    lintDocument,
    onDidSaveTextDocument,
    onDidOpenTextDocument,
    onDidChangeActiveTextEditor,
    diagnosticCollection,
    statusBarItem,
  )

  log('Extension "remark-lint" is now active.')
}

export function deactivate(): void {
  outputChannel.clear()
  outputChannel.dispose()
  diagnosticCollection.clear()
  diagnosticCollection.dispose()
  statusBarItem.hide()
  statusBarItem.dispose()
}

function lint(activeDocument: vscode.TextDocument) {
  const isMarkdownDocument = activeDocument.languageId === 'markdown'
  const isMdxDocument = activeDocument.languageId === 'mdx'

  if (!isMarkdownDocument && !isMdxDocument) {
    log('Active document is not a markdown or mdx document.')
    return
  }

  const path = activeDocument.isUntitled ? undefined : activeDocument.uri.fsPath
  const vfile = new VFile({ value: activeDocument.getText(), path })
  const processor = createProcessor()

  return new Promise<void>((resolve, reject) => {
    const name = 'remark'

    engine(
      {
        processor,
        files: [vfile],
        rcName: `.${name}rc`,
        packageField: `${name}Config`,
        ignoreName: `.${name}ignore`,
        pluginPrefix: name,
        color: true,
      },
      function done(error, status, context) {
        if (error) {
          reject()
          log('Encountered fatal error linting document.')
          setStatus('error')
        } else if (status === 1) {
          resolve()
          log('Failure linting document.')
          setStatus('error')
        } else {
          resolve()
          log('Successfully linted document.')
          context?.files?.forEach((file) => {
            const diagnostics = file.messages.map((message) => {
              const range = new vscode.Range(
                (message.position?.start.line ?? message.line ?? 1) - 1,
                (message.position?.start.column ?? message.column ?? 1) - 1,
                (message.position?.end.line ?? message.line ?? 1) - 1,
                message.position?.end.column ?? message.column ?? 1,
              )

              return new vscode.Diagnostic(
                range,
                [message.reason, `${message.source}(${message.ruleId})`].join(' - '),
                message.fatal ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
              )
            })

            if (diagnostics.length > 0) {
              diagnosticCollection.set(activeDocument.uri, diagnostics)
              setStatus('warn')
            } else {
              diagnosticCollection.clear()
              setStatus('success')
            }
          })
        }
      },
    )
  })
}
