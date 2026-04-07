/**
 * 分时数据点
 */
export interface MinuteData {
  /** 时间 (HH:mm) */
  time: string;
  /** 价格 */
  price: number;
  /** 成交量 */
  volume: number;
}

/**
 * 股票数据接口定义
 */
export interface StockData {
  /** 股票代码（带前缀，如 sh600519） */
  code: string;
  /** 股票名称 */
  name: string;
  /** 当前价格 */
  price: number;
  /** 昨日收盘价 */
  lastClose: number;
  /** 今日开盘价 */
  open: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 涨跌额 */
  change: number;
  /** 涨跌幅（百分比） */
  changePercent: number;
  /** 成交量（手） */
  volume: number;
  /** 成交额（元） */
  turnover: number;
  /** 更新时间 */
  updateTime: string;
  /** 分时数据 */
  minuteData?: MinuteData[];
}

/**
 * 股票配置
 */
export interface StockConfig {
  stocks: string[];
  refreshInterval: number;
  showStatusBar: boolean;
  statusBarStocks: string[];
}
