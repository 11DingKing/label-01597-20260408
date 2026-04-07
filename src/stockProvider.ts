import * as vscode from 'vscode';
import { StockData } from './types';
import { StockService } from './stockService';
import { logger } from './logger';

/**
 * 树视图项类型
 */
type TreeItemType = 'group' | 'stock' | 'loading' | 'empty' | 'welcome';

/**
 * 股票分组定义
 */
interface StockGroup {
  id: string;
  name: string;
  icon: string;
  codes: string[];
}

/**
 * 股票树视图项
 */
export class StockTreeItem extends vscode.TreeItem {
  public readonly itemType: TreeItemType;
  public readonly stock?: StockData;
  public readonly groupId?: string;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    itemType: TreeItemType,
    stock?: StockData,
    groupId?: string
  ) {
    super(label, collapsibleState);
    this.itemType = itemType;
    this.stock = stock;
    this.groupId = groupId;

    if (itemType === 'stock' && stock) {
      this.setupStockItem(stock);
    } else if (itemType === 'group') {
      this.setupGroupItem(label, groupId || '');
    } else if (itemType === 'loading') {
      this.setupLoadingItem();
    } else if (itemType === 'empty') {
      this.setupEmptyItem();
    } else if (itemType === 'welcome') {
      this.setupWelcomeItem();
    }
  }

  private setupStockItem(stock: StockData): void {
    const config = vscode.workspace.getConfiguration('astock');
    const showPercent: boolean = config.get('showPercent') ?? true;
    const showPrice: boolean = config.get('showPrice') ?? true;

    // 格式化显示
    const priceStr = StockService.formatPrice(stock.price);
    const percentStr = StockService.formatPercent(stock.changePercent);

    // 构建描述
    const descParts: string[] = [];
    if (showPrice) {
      descParts.push(priceStr);
    }
    if (showPercent) {
      descParts.push(percentStr);
    }

    this.label = stock.name;
    this.description = descParts.join('  ');

    // 设置图标 - 更丰富的视觉效果
    if (stock.changePercent > 5) {
      this.iconPath = new vscode.ThemeIcon(
        'rocket',
        new vscode.ThemeColor('charts.red')
      );
    } else if (stock.changePercent > 0) {
      this.iconPath = new vscode.ThemeIcon(
        'triangle-up',
        new vscode.ThemeColor('charts.red')
      );
    } else if (stock.changePercent < -5) {
      this.iconPath = new vscode.ThemeIcon(
        'debug-step-into',
        new vscode.ThemeColor('charts.green')
      );
    } else if (stock.changePercent < 0) {
      this.iconPath = new vscode.ThemeIcon(
        'triangle-down',
        new vscode.ThemeColor('charts.green')
      );
    } else {
      this.iconPath = new vscode.ThemeIcon(
        'dash',
        new vscode.ThemeColor('charts.yellow')
      );
    }

    // 详细的悬停提示
    this.tooltip = this.createTooltip(stock);

    // 设置上下文
    this.contextValue = 'stock';

    // 点击命令
    this.command = {
      command: 'astock.showStockDetail',
      title: '查看详情',
      arguments: [stock],
    };
  }

  private createTooltip(stock: StockData): vscode.MarkdownString {
    const changeSign = stock.change >= 0 ? '+' : '';
    const percentSign = stock.changePercent >= 0 ? '+' : '';

    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;

    tooltip.appendMarkdown(`## 📊 ${stock.name}\n\n`);
    tooltip.appendMarkdown(`**代码**: \`${stock.code.toUpperCase()}\`\n\n`);
    tooltip.appendMarkdown(`---\n\n`);

    // 价格信息
    tooltip.appendMarkdown(`### 💰 价格信息\n\n`);
    tooltip.appendMarkdown(
      `| 指标 | 数值 |\n|:-----|-----:|\n`
    );
    tooltip.appendMarkdown(
      `| 当前价 | **${StockService.formatPrice(stock.price)}** |\n`
    );
    tooltip.appendMarkdown(
      `| 涨跌额 | ${changeSign}${stock.change.toFixed(2)} |\n`
    );
    tooltip.appendMarkdown(
      `| 涨跌幅 | ${percentSign}${stock.changePercent.toFixed(2)}% |\n`
    );

    tooltip.appendMarkdown(`\n### 📈 今日行情\n\n`);
    tooltip.appendMarkdown(
      `| 指标 | 数值 |\n|:-----|-----:|\n`
    );
    tooltip.appendMarkdown(
      `| 今开 | ${StockService.formatPrice(stock.open)} |\n`
    );
    tooltip.appendMarkdown(
      `| 昨收 | ${StockService.formatPrice(stock.lastClose)} |\n`
    );
    tooltip.appendMarkdown(
      `| 最高 | ${StockService.formatPrice(stock.high)} |\n`
    );
    tooltip.appendMarkdown(
      `| 最低 | ${StockService.formatPrice(stock.low)} |\n`
    );

    tooltip.appendMarkdown(`\n### 📊 成交数据\n\n`);
    tooltip.appendMarkdown(
      `| 指标 | 数值 |\n|:-----|-----:|\n`
    );
    tooltip.appendMarkdown(
      `| 成交量 | ${StockService.formatVolume(stock.volume)} |\n`
    );
    tooltip.appendMarkdown(
      `| 成交额 | ${StockService.formatTurnover(stock.turnover)} |\n`
    );

    tooltip.appendMarkdown(`\n---\n`);
    tooltip.appendMarkdown(`\n*更新时间: ${stock.updateTime}*`);

    return tooltip;
  }

  private setupGroupItem(_label: string, groupId: string): void {
    // A 股市场分组图标映射
    const icons: Record<string, string> = {
      index: 'graph-line',
      sh: 'home',
      sz: 'organization',
    };
    this.iconPath = new vscode.ThemeIcon(icons[groupId] || 'folder');
    this.contextValue = 'group';
  }

  private setupLoadingItem(): void {
    this.iconPath = new vscode.ThemeIcon('loading~spin');
    this.description = '正在获取数据...';
  }

  private setupEmptyItem(): void {
    this.iconPath = new vscode.ThemeIcon('info');
    this.description = '点击 + 添加股票';
  }

  private setupWelcomeItem(): void {
    this.iconPath = new vscode.ThemeIcon('rocket');
    this.description = '开始使用';
    this.command = {
      command: 'astock.addStock',
      title: '添加股票',
    };
  }
}

/**
 * 股票列表数据提供者
 */
export class StockProvider implements vscode.TreeDataProvider<StockTreeItem> {
  private onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    StockTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private stockService: StockService;
  private stockDataMap: Map<string, StockData> = new Map();
  private isLoading: boolean = false;

  constructor() {
    this.stockService = new StockService();
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getStockData(code: string): StockData | undefined {
    return this.stockDataMap.get(code);
  }

  getAllStockData(): Map<string, StockData> {
    return this.stockDataMap;
  }

  setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.refresh();
  }

  async updateStockData(): Promise<void> {
    const config = vscode.workspace.getConfiguration('astock');
    const stockCodes: string[] = config.get('stocks') || [];

    if (stockCodes.length === 0) {
      this.stockDataMap.clear();
      this.refresh();
      return;
    }

    try {
      this.stockDataMap = await this.stockService.fetchStocks(stockCodes, true);
    } catch (error) {
      logger.error('更新股票数据失败', error);
    }

    this.refresh();
  }

  getTreeItem(element: StockTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StockTreeItem): Promise<StockTreeItem[]> {
    const config = vscode.workspace.getConfiguration('astock');
    const stockCodes: string[] = config.get('stocks') || [];
    const enableGroup: boolean = config.get('enableGroup') ?? true;

    // 显示加载状态
    if (this.isLoading && !element) {
      return [
        new StockTreeItem(
          '加载中...',
          vscode.TreeItemCollapsibleState.None,
          'loading'
        ),
      ];
    }

    // 空列表 - 返回空数组让 viewsWelcome 显示
    if (stockCodes.length === 0 && !element) {
      return [];
    }

    // 如果没有数据，先获取一次
    if (this.stockDataMap.size === 0 && !element) {
      await this.updateStockData();
    }

    // 分组显示
    if (enableGroup && !element) {
      return this.getGroupItems(stockCodes);
    }

    // 展开分组
    if (element?.itemType === 'group' && element.groupId) {
      return this.getStockItemsForGroup(element.groupId, stockCodes);
    }

    // 平铺显示
    if (!element) {
      return this.getAllStockItems(stockCodes);
    }

    return [];
  }

  private getGroupItems(stockCodes: string[]): StockTreeItem[] {
    const groups: StockGroup[] = [
      { id: 'index', name: '📊 指数', icon: 'graph-line', codes: [] },
      { id: 'sh', name: '🏛️ 沪市', icon: 'home', codes: [] },
      { id: 'sz', name: '🏢 深市', icon: 'organization', codes: [] },
    ];

    // 分类股票
    for (const code of stockCodes) {
      const lowerCode = code.toLowerCase();
      if (
        lowerCode.startsWith('sh000') ||
        lowerCode.startsWith('sz399') ||
        lowerCode.startsWith('sh880')
      ) {
        groups[0].codes.push(code); // 指数
      } else if (lowerCode.startsWith('sh')) {
        groups[1].codes.push(code); // 沪市
      } else if (lowerCode.startsWith('sz')) {
        groups[2].codes.push(code); // 深市
      }
    }

    // 创建分组项
    const items: StockTreeItem[] = [];
    for (const group of groups) {
      if (group.codes.length > 0) {
        // 计算分组统计
        let upCount = 0;
        let downCount = 0;
        for (const code of group.codes) {
          const data = this.stockDataMap.get(code);
          if (data) {
            if (data.changePercent > 0) {upCount++;}
            else if (data.changePercent < 0) {downCount++;}
          }
        }

        const groupItem = new StockTreeItem(
          `${group.name} (${group.codes.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'group',
          undefined,
          group.id
        );

        // 设置分组描述
        if (upCount > 0 || downCount > 0) {
          groupItem.description = `↑${upCount} ↓${downCount}`;
        }

        items.push(groupItem);
      }
    }

    return items;
  }

  private getStockItemsForGroup(
    groupId: string,
    stockCodes: string[]
  ): StockTreeItem[] {
    const items: StockTreeItem[] = [];

    for (const code of stockCodes) {
      const lowerCode = code.toLowerCase();
      let belongsToGroup = false;

      if (groupId === 'index') {
        belongsToGroup =
          lowerCode.startsWith('sh000') ||
          lowerCode.startsWith('sz399') ||
          lowerCode.startsWith('sh880');
      } else if (groupId === 'sh') {
        belongsToGroup =
          lowerCode.startsWith('sh') && !lowerCode.startsWith('sh000') && !lowerCode.startsWith('sh880');
      } else if (groupId === 'sz') {
        belongsToGroup =
          lowerCode.startsWith('sz') && !lowerCode.startsWith('sz399');
      }

      if (belongsToGroup) {
        const stockData = this.stockDataMap.get(code);
        if (stockData) {
          items.push(
            new StockTreeItem(
              stockData.name,
              vscode.TreeItemCollapsibleState.None,
              'stock',
              stockData
            )
          );
        } else {
          const item = new StockTreeItem(
            code.toUpperCase(),
            vscode.TreeItemCollapsibleState.None,
            'stock'
          );
          item.description = '无数据';
          item.iconPath = new vscode.ThemeIcon('warning');
          item.contextValue = 'stock';
          items.push(item);
        }
      }
    }

    // 按涨跌幅排序
    return this.sortStockItems(items);
  }

  private getAllStockItems(stockCodes: string[]): StockTreeItem[] {
    const items: StockTreeItem[] = [];

    for (const code of stockCodes) {
      const stockData = this.stockDataMap.get(code);
      if (stockData) {
        items.push(
          new StockTreeItem(
            stockData.name,
            vscode.TreeItemCollapsibleState.None,
            'stock',
            stockData
          )
        );
      } else {
        const item = new StockTreeItem(
          code.toUpperCase(),
          vscode.TreeItemCollapsibleState.None,
          'stock'
        );
        item.description = '无数据';
        item.iconPath = new vscode.ThemeIcon('warning');
        item.contextValue = 'stock';
        items.push(item);
      }
    }

    return this.sortStockItems(items);
  }

  private sortStockItems(items: StockTreeItem[]): StockTreeItem[] {
    const config = vscode.workspace.getConfiguration('astock');
    const sortBy: string = config.get('sortBy') || 'none';

    if (sortBy === 'none') {
      return items;
    }

    return items.sort((a, b) => {
      if (!a.stock || !b.stock) {return 0;}

      if (sortBy === 'changeDesc') {
        return b.stock.changePercent - a.stock.changePercent;
      } else if (sortBy === 'changeAsc') {
        return a.stock.changePercent - b.stock.changePercent;
      }

      return 0;
    });
  }
}
