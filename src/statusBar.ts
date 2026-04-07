import * as vscode from 'vscode';
import { StockData } from './types';
import { StockService } from './stockService';

/**
 * 状态栏管理器
 * 在 VS Code 状态栏显示股票信息，支持自定义模板
 */
export class StatusBarManager {
  private statusBarItems: Map<string, vscode.StatusBarItem> = new Map();
  private stockService: StockService;

  // 自定义图标
  private readonly icons = {
    up: '📈',
    down: '📉',
    flat: '➖',
    rocket: '🚀',
    crash: '💥',
    fire: '🔥',
    money: '💰',
  };

  constructor() {
    this.stockService = new StockService();
  }

  /**
   * 更新状态栏显示
   */
  async updateStatusBar(stockDataMap: Map<string, StockData>): Promise<void> {
    const config = vscode.workspace.getConfiguration('astock');
    const showStatusBar: boolean = config.get('showStatusBar') ?? true;
    const statusBarStocks: string[] = config.get('statusBarStocks') || [];
    const statusBarTemplate: string =
      config.get('statusBarTemplate') || '${icon} ${name} ${price} ${percent}';

    if (!showStatusBar) {
      this.clearAll();
      return;
    }

    // 移除不再需要显示的股票
    for (const code of this.statusBarItems.keys()) {
      if (!statusBarStocks.includes(code)) {
        this.removeStatusBarItem(code);
      }
    }

    // 更新或创建状态栏项
    let priority = 100;
    for (const code of statusBarStocks) {
      const stockData = stockDataMap.get(code);
      if (stockData) {
        this.updateStatusBarItem(stockData, priority--, statusBarTemplate);
      }
    }
  }

  /**
   * 更新单个状态栏项
   */
  private updateStatusBarItem(
    stock: StockData,
    priority: number,
    template: string
  ): void {
    let item = this.statusBarItems.get(stock.code);

    if (!item) {
      item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        priority
      );
      this.statusBarItems.set(stock.code, item);
    }

    // 选择图标
    let icon = this.icons.flat;
    if (stock.changePercent > 5) {
      icon = this.icons.rocket;
    } else if (stock.changePercent > 2) {
      icon = this.icons.fire;
    } else if (stock.changePercent > 0) {
      icon = this.icons.up;
    } else if (stock.changePercent < -5) {
      icon = this.icons.crash;
    } else if (stock.changePercent < 0) {
      icon = this.icons.down;
    }

    // 格式化数据
    const priceStr = StockService.formatPrice(stock.price);
    const percentStr = StockService.formatPercent(stock.changePercent);
    const changeStr =
      stock.change >= 0
        ? `+${stock.change.toFixed(2)}`
        : stock.change.toFixed(2);

    // 应用模板
    const text = template
      .replace('${icon}', icon)
      .replace('${name}', stock.name)
      .replace('${code}', stock.code.toUpperCase())
      .replace('${price}', priceStr)
      .replace('${percent}', percentStr)
      .replace('${change}', changeStr);

    item.text = text;

    // 设置颜色
    if (stock.changePercent > 0) {
      item.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    } else if (stock.changePercent < 0) {
      item.backgroundColor = undefined;
    } else {
      item.backgroundColor = undefined;
    }

    // 设置悬停提示
    item.tooltip = this.createTooltip(stock);
    item.command = {
      command: 'astock.showStockDetail',
      title: '查看详情',
      arguments: [stock],
    };
    item.show();
  }

  private createTooltip(stock: StockData): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    const changeSign = stock.change >= 0 ? '+' : '';
    const arrow = stock.changePercent > 0 ? '↑' : stock.changePercent < 0 ? '↓' : '→';

    tooltip.appendMarkdown(`### ${stock.name} (${stock.code.toUpperCase()})\n\n`);
    tooltip.appendMarkdown(
      `**${StockService.formatPrice(stock.price)}** ${arrow} ${changeSign}${stock.change.toFixed(2)} (${StockService.formatPercent(stock.changePercent)})\n\n`
    );
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(
      `| 今开 | 昨收 | 最高 | 最低 |\n`
    );
    tooltip.appendMarkdown(`|:----:|:----:|:----:|:----:|\n`);
    tooltip.appendMarkdown(
      `| ${StockService.formatPrice(stock.open)} | ${StockService.formatPrice(stock.lastClose)} | ${StockService.formatPrice(stock.high)} | ${StockService.formatPrice(stock.low)} |\n`
    );
    tooltip.appendMarkdown(`\n`);
    tooltip.appendMarkdown(
      `**成交量**: ${StockService.formatVolume(stock.volume)} | **成交额**: ${StockService.formatTurnover(stock.turnover)}\n\n`
    );
    tooltip.appendMarkdown(`*${stock.updateTime}*`);

    return tooltip;
  }

  private removeStatusBarItem(code: string): void {
    const item = this.statusBarItems.get(code);
    if (item) {
      item.dispose();
      this.statusBarItems.delete(code);
    }
  }

  clearAll(): void {
    for (const item of this.statusBarItems.values()) {
      item.dispose();
    }
    this.statusBarItems.clear();
  }

  dispose(): void {
    this.clearAll();
  }
}
