import * as https from 'https';
import * as http from 'http';
import * as iconv from 'iconv-lite';
import { StockData, MinuteData } from './types';
import { logger } from './logger';

/** 请求配置 */
interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const defaultConfig: Required<RequestConfig> = {
  timeout: 10000,    // 10秒超时
  retries: 2,        // 重试2次
  retryDelay: 1000,  // 重试间隔1秒
};

/**
 * 股票数据服务
 * 使用新浪财经 API 获取 A 股实时行情
 */
export class StockService {
  // 新浪财经 API
  private static readonly sinaApi = 'https://hq.sinajs.cn/list=';
  
  // 连续失败计数
  private static failureCount = 0;
  private static readonly maxSilentFailures = 3;

  /**
   * 获取多只股票的实时数据
   * @param codes 股票代码数组，如 ['sh600519', 'sz000001']
   * @param silent 是否静默模式（不显示错误给用户）
   */
  public async fetchStocks(codes: string[], silent = false): Promise<Map<string, StockData>> {
    const result = new Map<string, StockData>();

    if (codes.length === 0) {
      return result;
    }

    try {
      const url = StockService.sinaApi + codes.join(',');
      const responseData = await this.httpGetWithRetry(url);

      // 解析返回数据
      const lines = responseData.split('\n');
      for (const line of lines) {
        const stock = this.parseSinaData(line);
        if (stock) {
          result.set(stock.code, stock);
        }
      }
      
      // 成功后重置失败计数
      StockService.failureCount = 0;
    } catch (error) {
      StockService.failureCount++;
      logger.error('获取股票数据失败', error);
      
      // 连续失败超过阈值时提示用户
      if (!silent && StockService.failureCount >= StockService.maxSilentFailures) {
        logger.showWarning(`股票数据获取失败，请检查网络连接`);
        StockService.failureCount = 0; // 重置，避免频繁提示
      }
    }

    return result;
  }

  /**
   * 获取单只股票数据
   */
  public async fetchStock(code: string): Promise<StockData | null> {
    const stocks = await this.fetchStocks([code], false);
    return stocks.get(code) || null;
  }

  /**
   * 解析新浪财经返回的数据
   * 格式: var hq_str_sh600519="贵州茅台,1800.00,1795.00,1810.00,..."
   */
  private parseSinaData(line: string): StockData | null {
    const match = line.match(/var hq_str_(\w+)="(.*)"/);
    if (!match || !match[2]) {
      return null;
    }

    const code = match[1];
    const data = match[2].split(',');

    if (data.length < 32) {
      return null;
    }

    const name = data[0];
    const open = parseFloat(data[1]) || 0;
    const lastClose = parseFloat(data[2]) || 0;
    const price = parseFloat(data[3]) || 0;
    const high = parseFloat(data[4]) || 0;
    const low = parseFloat(data[5]) || 0;
    const volume = parseFloat(data[8]) || 0; // 成交量（股）
    const turnover = parseFloat(data[9]) || 0; // 成交额（元）
    const date = data[30];
    const time = data[31];

    // 计算涨跌
    const change = lastClose > 0 ? price - lastClose : 0;
    const changePercent = lastClose > 0 ? (change / lastClose) * 100 : 0;

    return {
      code,
      name,
      price,
      lastClose,
      open,
      high,
      low,
      change,
      changePercent,
      volume: Math.round(volume / 100), // 转换为手
      turnover,
      updateTime: `${date} ${time}`,
    };
  }

  /**
   * 带重试的 HTTP GET 请求
   */
  private async httpGetWithRetry(url: string, config: RequestConfig = {}): Promise<string> {
    const { timeout, retries, retryDelay } = { ...defaultConfig, ...config };
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(`重试请求 (${attempt}/${retries}): ${url}`);
          await this.delay(retryDelay);
        }
        return await this.httpGet(url, timeout);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`请求失败 (${attempt + 1}/${retries + 1}): ${lastError.message}`);
      }
    }
    
    throw lastError || new Error('请求失败');
  }

  /**
   * HTTP GET 请求（带超时）
   */
  private httpGet(url: string, timeout: number = defaultConfig.timeout): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(
        url,
        {
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Referer': 'https://finance.sina.com.cn',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout,
        },
        (res) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            // 新浪接口返回 GBK 编码
            const data = iconv.decode(buffer, 'gbk');
            resolve(data);
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`请求超时 (${timeout}ms)`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证股票代码格式
   * @param code 股票代码
   */
  public static validateCode(code: string): boolean {
    // 支持格式: sh600519, sz000001, sh000001(上证指数)
    return /^(sh|sz)\d{6}$/i.test(code);
  }

  /**
   * 格式化股票代码
   */
  public static formatCode(code: string): string {
    return code.toLowerCase().trim();
  }

  /**
   * 格式化价格显示
   */
  public static formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * 格式化涨跌幅显示
   */
  public static formatPercent(percent: number): string {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  }

  /**
   * 格式化成交量
   */
  public static formatVolume(volume: number): string {
    if (volume >= 10000) {
      return `${(volume / 10000).toFixed(2)}万手`;
    }
    return `${volume}手`;
  }

  /**
   * 格式化成交额
   */
  public static formatTurnover(turnover: number): string {
    if (turnover >= 100000000) {
      return `${(turnover / 100000000).toFixed(2)}亿`;
    }
    if (turnover >= 10000) {
      return `${(turnover / 10000).toFixed(2)}万`;
    }
    return `${turnover.toFixed(2)}`;
  }

  /**
   * 获取分时数据
   * 使用新浪财经分时数据接口
   * @param code 股票代码
   */
  public async fetchMinuteData(code: string): Promise<MinuteData[]> {
    try {
      // 新浪分时数据接口
      const url = `https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20_${code}_today=/CN_MarketDataService.getKLineData?symbol=${code}&scale=1&ma=no&datalen=240`;
      const responseData = await this.httpGetWithRetry(url, { retries: 1 });
      
      // 解析 JSONP 响应，处理可能的前缀脚本
      const jsonMatch = responseData.match(/\((\[.*?\])\)/s);
      if (!jsonMatch || !jsonMatch[1]) {
        logger.warn('分时数据解析失败');
        return [];
      }

      const data = JSON.parse(jsonMatch[1]);
      const minuteData: MinuteData[] = [];

      // 获取最近交易日的数据
      if (data.length === 0) {return [];}
      
      // 找到最新的交易日期
      const latestDate = data[data.length - 1]?.day?.split(' ')[0];
      
      for (const item of data) {
        if (!item.day) {continue;}
        
        // 只保留最新交易日的数据
        const itemDate = item.day.split(' ')[0];
        if (itemDate !== latestDate) {continue;}
        
        const time = item.day.split(' ')[1]?.substring(0, 5) || '';
        const price = parseFloat(item.close) || 0;
        
        if (price > 0) {
          minuteData.push({
            time,
            price,
            volume: parseFloat(item.volume) || 0,
          });
        }
      }

      return minuteData;
    } catch (error) {
      logger.error('获取分时数据失败', error);
      return [];
    }
  }
}
