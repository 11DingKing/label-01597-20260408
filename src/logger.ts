import * as vscode from 'vscode';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 统一日志管理器
 */
class Logger {
  private outputChannel: vscode.OutputChannel;
  private level: LogLevel = LogLevel.INFO;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('A股关注');
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const msg = this.formatMessage('DEBUG', message);
      this.outputChannel.appendLine(msg + (args.length ? ' ' + JSON.stringify(args) : ''));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      const msg = this.formatMessage('INFO', message);
      this.outputChannel.appendLine(msg + (args.length ? ' ' + JSON.stringify(args) : ''));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      const msg = this.formatMessage('WARN', message);
      this.outputChannel.appendLine(msg + (args.length ? ' ' + JSON.stringify(args) : ''));
    }
  }

  error(message: string, error?: Error | unknown): void {
    const msg = this.formatMessage('ERROR', message);
    const errorDetail = error instanceof Error ? `${error.message}\n${error.stack}` : String(error || '');
    this.outputChannel.appendLine(msg + (errorDetail ? '\n' + errorDetail : ''));
  }

  /**
   * 显示错误消息给用户
   */
  showError(message: string, error?: Error | unknown): void {
    this.error(message, error);
    const userMessage = error instanceof Error ? `${message}: ${error.message}` : message;
    vscode.window.showErrorMessage(userMessage);
  }

  /**
   * 显示警告消息给用户
   */
  showWarning(message: string): void {
    this.warn(message);
    vscode.window.showWarningMessage(message);
  }

  /**
   * 显示信息消息给用户
   */
  showInfo(message: string): void {
    this.info(message);
    vscode.window.showInformationMessage(message);
  }

  /**
   * 显示输出面板
   */
  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
