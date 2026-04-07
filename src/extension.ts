import * as vscode from 'vscode';
import { StockProvider, StockTreeItem } from './stockProvider';
import { StatusBarManager } from './statusBar';
import { StockService } from './stockService';
import { StockData } from './types';
import { logger } from './logger';
import { generateStockDetailHtml } from './webview/stockDetailView';

let stockProvider: StockProvider;
let statusBarManager: StatusBarManager;
let refreshTimer: NodeJS.Timeout | undefined;

/**
 * 插件激活入口
 */
export function activate(context: vscode.ExtensionContext) {
  logger.info('A股股票关注插件已激活');

  // 初始化
  stockProvider = new StockProvider();
  statusBarManager = new StatusBarManager();

  // 注册树视图
  const treeView = vscode.window.createTreeView('astockList', {
    treeDataProvider: stockProvider,
    showCollapseAll: true,
  });

  // 注册命令
  const commands = [
    vscode.commands.registerCommand('astock.addStock', addStock),
    vscode.commands.registerCommand('astock.removeStock', removeStock),
    vscode.commands.registerCommand('astock.refreshAll', () => refreshAll(true)),
    vscode.commands.registerCommand('astock.showStockDetail', showStockDetail),
    vscode.commands.registerCommand('astock.sortByChangeDesc', () =>
      setSortBy('changeDesc')
    ),
    vscode.commands.registerCommand('astock.sortByChangeAsc', () =>
      setSortBy('changeAsc')
    ),
    vscode.commands.registerCommand('astock.sortByNone', () =>
      setSortBy('none')
    ),
    vscode.commands.registerCommand('astock.toggleGroup', toggleGroup),
    vscode.commands.registerCommand('astock.addToStatusBar', addToStatusBar),
  ];

  // 监听配置变化
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('astock')) {
      setupRefreshTimer();
      refreshAll();
    }
  });

  context.subscriptions.push(treeView, configWatcher, ...commands);

  setupRefreshTimer();
  refreshAll();
}

export function deactivate() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}

function setupRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }

  const config = vscode.workspace.getConfiguration('astock');
  const interval: number = config.get('refreshInterval') || 10;
  const ms = Math.max(interval, 5) * 1000;

  refreshTimer = setInterval(() => {
    refreshAll(false);
  }, ms);
}

async function refreshAll(showMessage: boolean = false) {
  try {
    stockProvider.setLoading(true);
    await stockProvider.updateStockData();
    const stockDataMap = stockProvider.getAllStockData();
    await statusBarManager.updateStatusBar(stockDataMap);
    stockProvider.setLoading(false);
    
    if (showMessage) {
      const count = stockDataMap.size;
      if (count > 0) {
        logger.showInfo(`✅ 已刷新 ${count} 只股票数据`);
      } else {
        logger.showWarning('暂无股票数据，请先添加股票');
      }
    }
  } catch (error) {
    stockProvider.setLoading(false);
    logger.error('刷新股票数据失败', error);
    if (showMessage) {
      logger.showError('刷新失败，请检查网络连接', error);
    }
  }
}

/**
 * 添加股票 - 支持模糊搜索
 */
async function addStock() {
  // 快速选择常用股票
  const quickPicks: vscode.QuickPickItem[] = [
    { label: '$(search) 手动输入股票代码', description: '输入完整代码如 sh600519' },
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: '上证指数', description: 'sh000001', detail: '上海证券交易所综合指数' },
    { label: '深证成指', description: 'sz399001', detail: '深圳证券交易所成分指数' },
    { label: '创业板指', description: 'sz399006', detail: '创业板指数' },
    { label: '科创50', description: 'sh000688', detail: '科创板50指数' },
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: '贵州茅台', description: 'sh600519', detail: '白酒龙头' },
    { label: '中国平安', description: 'sh601318', detail: '保险龙头' },
    { label: '招商银行', description: 'sh600036', detail: '银行龙头' },
    { label: '宁德时代', description: 'sz300750', detail: '新能源电池龙头' },
    { label: '比亚迪', description: 'sz002594', detail: '新能源汽车龙头' },
  ];

  const selected = await vscode.window.showQuickPick(quickPicks, {
    placeHolder: '选择股票或手动输入',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selected) {return;}

  let code: string;

  if (selected.label === '$(search) 手动输入股票代码') {
    const input = await vscode.window.showInputBox({
      prompt: '请输入股票代码',
      placeHolder: '例如: sh600519（沪市）、sz000001（深市）',
      validateInput: (value) => {
        if (!value) {return '请输入股票代码';}
        const c = StockService.formatCode(value);
        if (!StockService.validateCode(c)) {
          return '格式不正确，请输入如 sh600519 或 sz000001';
        }
        return null;
      },
    });
    if (!input) {return;}
    code = StockService.formatCode(input);
  } else {
    code = selected.description || '';
    if (!code) {return;}
    // 校验 QuickPick 选择的代码格式
    if (!StockService.validateCode(code)) {
      vscode.window.showErrorMessage(`股票代码格式不正确: ${code}`);
      return;
    }
  }

  // 检查是否已存在
  const config = vscode.workspace.getConfiguration('astock');
  const stocks: string[] = config.get('stocks') || [];

  if (stocks.includes(code)) {
    vscode.window.showWarningMessage(`股票 ${code} 已在关注列表中`);
    return;
  }

  // 验证股票代码并获取数据
  const stockService = new StockService();
  let stockData;
  try {
    stockData = await stockService.fetchStock(code);
  } catch (error) {
    vscode.window.showErrorMessage(`获取股票数据失败: ${error instanceof Error ? error.message : '网络错误'}`);
    return;
  }

  if (!stockData || !stockData.name) {
    const confirm = await vscode.window.showWarningMessage(
      `无法获取 ${code} 的数据，是否仍要添加？`,
      '添加',
      '取消'
    );
    if (confirm !== '添加') {return;}
  }

  stocks.push(code);
  await config.update('stocks', stocks, vscode.ConfigurationTarget.Global);

  const stockName = stockData?.name || code;
  vscode.window.showInformationMessage(`✅ 已添加: ${stockName}`);
  refreshAll();
}

/**
 * 删除股票
 */
async function removeStock(item?: StockTreeItem) {
  let code: string;

  if (item?.stock) {
    code = item.stock.code;
  } else if (item && typeof item.label === 'string' && item.itemType === 'stock') {
    code = item.label.toLowerCase();
  } else {
    const config = vscode.workspace.getConfiguration('astock');
    const stocks: string[] = config.get('stocks') || [];

    if (stocks.length === 0) {
      vscode.window.showWarningMessage('关注列表为空');
      return;
    }

    const stockDataMap = stockProvider.getAllStockData();
    const items = stocks.map((s) => {
      const data = stockDataMap.get(s);
      const percent = data ? StockService.formatPercent(data.changePercent) : '';
      return {
        label: data?.name || s,
        description: `${s.toUpperCase()} ${percent}`,
        code: s,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择要删除的股票',
    });

    if (!selected) {return;}
    code = selected.code;
  }

  const stockData = stockProvider.getStockData(code);
  const stockName = stockData?.name || code;

  const confirm = await vscode.window.showWarningMessage(
    `确定要删除 ${stockName} 吗？`,
    '删除',
    '取消'
  );

  if (confirm !== '删除') {return;}

  const config = vscode.workspace.getConfiguration('astock');
  const stocks: string[] = config.get('stocks') || [];
  const newStocks = stocks.filter((s) => s !== code);
  await config.update('stocks', newStocks, vscode.ConfigurationTarget.Global);

  const statusBarStocks: string[] = config.get('statusBarStocks') || [];
  const newStatusBarStocks = statusBarStocks.filter((s) => s !== code);
  if (newStatusBarStocks.length !== statusBarStocks.length) {
    await config.update(
      'statusBarStocks',
      newStatusBarStocks,
      vscode.ConfigurationTarget.Global
    );
  }

  vscode.window.showInformationMessage(`🗑️ 已删除: ${stockName}`);
  refreshAll();
}

/**
 * 设置排序方式
 */
async function setSortBy(sortBy: string) {
  const config = vscode.workspace.getConfiguration('astock');
  await config.update('sortBy', sortBy, vscode.ConfigurationTarget.Global);
  stockProvider.refresh();

  const sortNames: Record<string, string> = {
    changeDesc: '涨幅从高到低',
    changeAsc: '涨幅从低到高',
    none: '默认顺序',
  };
  vscode.window.showInformationMessage(`📊 排序: ${sortNames[sortBy]}`);
}

/**
 * 切换分组显示
 */
async function toggleGroup() {
  const config = vscode.workspace.getConfiguration('astock');
  const enableGroup: boolean = config.get('enableGroup') ?? true;
  await config.update(
    'enableGroup',
    !enableGroup,
    vscode.ConfigurationTarget.Global
  );
  stockProvider.refresh();

  vscode.window.showInformationMessage(
    enableGroup ? '📋 已切换为平铺显示' : '📂 已切换为分组显示'
  );
}

/**
 * 添加到状态栏
 */
async function addToStatusBar(item?: StockTreeItem) {
  let code: string;

  if (item?.stock) {
    code = item.stock.code;
  } else {
    const config = vscode.workspace.getConfiguration('astock');
    const stocks: string[] = config.get('stocks') || [];
    const statusBarStocks: string[] = config.get('statusBarStocks') || [];

    const availableStocks = stocks.filter((s) => !statusBarStocks.includes(s));
    if (availableStocks.length === 0) {
      vscode.window.showWarningMessage('没有可添加的股票');
      return;
    }

    const stockDataMap = stockProvider.getAllStockData();
    const items = availableStocks.map((s) => {
      const data = stockDataMap.get(s);
      return {
        label: data?.name || s,
        description: s.toUpperCase(),
        code: s,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择要添加到状态栏的股票',
    });

    if (!selected) {return;}
    code = selected.code;
  }

  const config = vscode.workspace.getConfiguration('astock');
  const statusBarStocks: string[] = config.get('statusBarStocks') || [];

  if (statusBarStocks.includes(code)) {
    vscode.window.showWarningMessage('该股票已在状态栏显示');
    return;
  }

  statusBarStocks.push(code);
  await config.update(
    'statusBarStocks',
    statusBarStocks,
    vscode.ConfigurationTarget.Global
  );

  const stockData = stockProvider.getStockData(code);
  vscode.window.showInformationMessage(
    `📌 已添加到状态栏: ${stockData?.name || code}`
  );
  refreshAll();
}

/**
 * 显示股票详情
 */
async function showStockDetail(stock?: StockData) {
  if (!stock) {
    const config = vscode.workspace.getConfiguration('astock');
    const stocks: string[] = config.get('stocks') || [];

    if (stocks.length === 0) {
      vscode.window.showWarningMessage('关注列表为空');
      return;
    }

    const stockDataMap = stockProvider.getAllStockData();
    const items = stocks
      .map((code) => {
        const data = stockDataMap.get(code);
        if (data) {
          return {
            label: data.name,
            description: `${StockService.formatPrice(data.price)} ${StockService.formatPercent(data.changePercent)}`,
            stock: data,
          };
        }
        return null;
      })
      .filter(Boolean) as { label: string; description: string; stock: StockData }[];

    if (items.length === 0) {
      vscode.window.showWarningMessage('暂无股票数据');
      return;
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择要查看的股票',
    });

    if (!selected) {return;}
    stock = selected.stock;
  }

  // 获取分时数据
  const stockService = new StockService();
  const minuteData = await stockService.fetchMinuteData(stock.code);
  stock.minuteData = minuteData;

  const panel = vscode.window.createWebviewPanel(
    'stockDetail',
    `${stock.name} - 详情`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = generateStockDetailHtml(stock);
}
