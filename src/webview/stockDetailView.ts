import { StockData } from '../types';
import { StockService } from '../stockService';

/**
 * 生成股票详情 Webview HTML
 */
export function generateStockDetailHtml(stock: StockData): string {
  const isUp = stock.changePercent >= 0;
  const changeSign = stock.change >= 0 ? '+' : '';
  const trendColor = isUp ? '#ef4444' : '#22c55e';
  const trendBg = isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
  const arrow = isUp ? '▲' : '▼';

  const chartHtml = generateMiniChart(stock, trendColor);
  const amplitude = stock.lastClose > 0 
    ? ((stock.high - stock.low) / stock.lastClose * 100).toFixed(2) 
    : '0.00';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${stock.name}</title>
  <style>${getStyles(trendColor, trendBg, stock)}</style>
</head>
<body>
  <div class="container">
    ${generateHeader(stock, isUp, trendBg, trendColor)}
    ${generatePriceCard(stock, trendColor, trendBg, changeSign, arrow, chartHtml)}
    ${generateDataGrid(stock)}
    ${generateRangeCard(stock, amplitude, trendColor)}
    ${generateFooter(stock, trendColor)}
  </div>
</body>
</html>`;
}

/**
 * 生成分时走势图
 */
function generateMiniChart(stock: StockData, trendColor: string): string {
  const minuteData = stock.minuteData || [];
  const width = 400;
  const height = 100;
  const padding = 2;

  if (minuteData.length === 0) {
    return `<div class="no-data">暂无分时数据</div>`;
  }

  const prices = minuteData.map(d => d.price).filter(p => p > 0);
  if (prices.length === 0) {
    return `<div class="no-data">暂无分时数据</div>`;
  }

  // 计算价格范围，包含昨收价
  const allPrices = [...prices, stock.lastClose];
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  // 计算 Y 坐标（留出上下边距）
  const chartHeight = height - padding * 2;
  const getY = (price: number) => {
    return padding + chartHeight - ((price - min) / range) * chartHeight;
  };

  // 生成路径点
  const pathPoints = prices
    .map((p, i) => {
      const x = (i / Math.max(prices.length - 1, 1)) * width;
      const y = getY(p);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  // 昨收线 Y 坐标
  const lastCloseY = getY(stock.lastClose);
  
  // 最后一个点的位置
  const lastY = getY(prices[prices.length - 1]);

  // 填充区域路径
  const fillPath = `${pathPoints} L ${width} ${height} L 0 ${height} Z`;

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
    <defs>
      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${trendColor};stop-opacity:0.35" />
        <stop offset="100%" style="stop-color:${trendColor};stop-opacity:0.02" />
      </linearGradient>
    </defs>
    <!-- 昨收基准线 -->
    <line x1="0" y1="${lastCloseY.toFixed(2)}" x2="${width}" y2="${lastCloseY.toFixed(2)}" 
          stroke="#888" stroke-width="1" stroke-dasharray="6,4" opacity="0.6" vector-effect="non-scaling-stroke" />
    <!-- 填充区域 -->
    <path d="${fillPath}" fill="url(#chartGradient)" />
    <!-- 走势线 -->
    <path d="${pathPoints}" fill="none" stroke="${trendColor}" stroke-width="2" 
          stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    <!-- 当前价格点 -->
    <circle cx="${width}" cy="${lastY.toFixed(2)}" r="4" fill="${trendColor}" />
  </svg>
  <div class="chart-label-baseline" style="top: ${(lastCloseY / height) * 100}%;">昨收</div>`;
}

/**
 * 生成头部
 */
function generateHeader(stock: StockData, isUp: boolean, trendBg: string, trendColor: string): string {
  const badge = isUp ? '上涨' : stock.changePercent < 0 ? '下跌' : '平盘';
  return `
    <div class="header">
      <div class="stock-title">
        <h1 class="stock-name">${stock.name}</h1>
        <span class="stock-code">${stock.code.toUpperCase()}</span>
      </div>
      <span class="stock-badge" style="background: ${trendBg}; color: ${trendColor};">${badge}</span>
    </div>`;
}

/**
 * 生成价格卡片
 */
function generatePriceCard(
  stock: StockData, 
  trendColor: string, 
  trendBg: string,
  changeSign: string, 
  arrow: string, 
  chartHtml: string
): string {
  return `
    <div class="price-card" style="background: linear-gradient(145deg, ${trendBg}, transparent 70%); border-color: ${trendColor}20;">
      <div class="price-header">
        <div class="price-main">
          <span class="current-price" style="color: ${trendColor};">${StockService.formatPrice(stock.price)}</span>
          <div class="price-sub">
            <span class="change-badge" style="background: ${trendColor};">${arrow} ${Math.abs(stock.changePercent).toFixed(2)}%</span>
            <span class="change-value-text" style="color: ${trendColor};">${changeSign}${stock.change.toFixed(2)}</span>
          </div>
        </div>
        <div class="price-compare">
          <div class="compare-item">昨收<span>${StockService.formatPrice(stock.lastClose)}</span></div>
          <div class="compare-item">今开<span>${StockService.formatPrice(stock.open)}</span></div>
        </div>
      </div>
      
      <div class="chart-section">
        <div class="chart-header">
          <span class="chart-title" style="--trend-color: ${trendColor};">分时走势</span>
          <span class="chart-time">${stock.minuteData && stock.minuteData.length > 0 ? `${stock.minuteData.length} 个数据点` : ''}</span>
        </div>
        <div class="chart-wrapper">
          ${chartHtml}
        </div>
      </div>
    </div>`;
}

/**
 * 生成数据网格
 */
function generateDataGrid(stock: StockData): string {
  return `
    <div class="data-grid">
      <div class="data-card">
        <div class="data-label">最高</div>
        <div class="data-value up">${StockService.formatPrice(stock.high)}</div>
      </div>
      <div class="data-card">
        <div class="data-label">最低</div>
        <div class="data-value down">${StockService.formatPrice(stock.low)}</div>
      </div>
      <div class="data-card">
        <div class="data-label">📊 成交量</div>
        <div class="data-value neutral">${StockService.formatVolume(stock.volume)}</div>
      </div>
      <div class="data-card">
        <div class="data-label">💰 成交额</div>
        <div class="data-value neutral">${StockService.formatTurnover(stock.turnover)}</div>
      </div>
    </div>`;
}

/**
 * 生成价格区间卡片
 */
function generateRangeCard(stock: StockData, amplitude: string, trendColor: string): string {
  const position = Math.max(0, Math.min(100, ((stock.price - stock.low) / (stock.high - stock.low || 1)) * 100));
  return `
    <div class="range-card">
      <div class="range-header">
        <span class="range-title">今日区间</span>
        <span class="range-amplitude">振幅 <span style="color: ${trendColor};">${amplitude}%</span></span>
      </div>
      <div class="range-track">
        <div class="range-thumb" style="left: ${position}%; border-color: ${trendColor};"></div>
      </div>
      <div class="range-labels">
        <span class="range-low">${StockService.formatPrice(stock.low)}</span>
        <span class="range-high">${StockService.formatPrice(stock.high)}</span>
      </div>
    </div>`;
}

/**
 * 生成底部
 */
function generateFooter(stock: StockData, trendColor: string): string {
  return `
    <div class="footer">
      <span class="update-time"><span class="update-dot" style="background: ${trendColor};"></span>${stock.updateTime}</span>
      <span class="disclaimer">数据仅供参考</span>
    </div>`;
}

/**
 * 生成样式
 */
function getStyles(trendColor: string, _trendBg: string, _stock: StockData): string {
  return `
    :root {
      --up-color: #ef4444;
      --down-color: #22c55e;
      --trend-color: ${trendColor};
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.06);
      --card-hover: rgba(255, 255, 255, 0.06);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      padding: 32px;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 520px; margin: 0 auto; }
    
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .stock-title { display: flex; align-items: center; gap: 12px; }
    .stock-name { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .stock-code {
      font-size: 12px; font-weight: 500;
      color: var(--vscode-descriptionForeground);
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 4px 10px; border-radius: 6px;
    }
    .stock-badge { font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; }

    .price-card {
      border: 1px solid;
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }
    .price-card::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 200px; height: 200px;
      background: radial-gradient(circle, ${trendColor}15 0%, transparent 70%);
      border-radius: 50%;
    }
    .price-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .price-main { display: flex; flex-direction: column; }
    .current-price { font-size: 52px; font-weight: 800; letter-spacing: -2px; line-height: 1; margin-bottom: 8px; }
    .price-sub { display: flex; align-items: center; gap: 12px; }
    .change-badge {
      display: inline-flex; align-items: center; gap: 6px;
      color: #fff; padding: 6px 14px; border-radius: 20px;
      font-size: 15px; font-weight: 700;
    }
    .change-value-text { font-size: 15px; font-weight: 600; opacity: 0.9; }
    .price-compare { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .compare-item { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .compare-item span { color: var(--vscode-foreground); font-weight: 500; margin-left: 6px; }

    .chart-section {
      margin-top: 24px;
      background: var(--vscode-editor-background);
      border-radius: 16px;
      padding: 16px;
      border: 1px solid var(--card-border);
    }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
    .chart-title {
      font-size: 13px; font-weight: 600;
      color: var(--vscode-foreground);
      display: flex; align-items: center; gap: 6px;
    }
    .chart-title::before {
      content: ''; width: 3px; height: 14px;
      background: var(--trend-color, ${trendColor});
      border-radius: 2px;
    }
    .chart-time { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .chart-wrapper {
      position: relative; width: 100%; height: 100px;
      border-radius: 8px; overflow: visible;
      background: rgba(0,0,0,0.15);
    }
    .chart-wrapper svg {
      border-radius: 8px;
    }
    .chart-label-baseline {
      position: absolute;
      right: -36px;
      font-size: 10px;
      color: #888;
      transform: translateY(-50%);
      white-space: nowrap;
    }
    .no-data {
      height: 100px;
      display: flex; align-items: center; justify-content: center;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      background: var(--card-bg);
      border-radius: 12px;
    }

    .data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
    .data-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 18px;
      transition: all 0.2s ease;
    }
    .data-card:hover { background: var(--card-hover); transform: translateY(-2px); }
    .data-label { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
    .data-value { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .data-value.up { color: var(--up-color); }
    .data-value.down { color: var(--down-color); }
    .data-value.neutral { color: var(--vscode-foreground); }

    .range-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .range-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .range-title {
      font-size: 13px; font-weight: 600;
      display: flex; align-items: center; gap: 6px;
    }
    .range-title::before {
      content: ''; width: 3px; height: 14px;
      background: linear-gradient(to bottom, var(--down-color), var(--up-color));
      border-radius: 2px;
    }
    .range-amplitude { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .range-amplitude span { font-weight: 600; }
    .range-track {
      position: relative; height: 6px;
      background: linear-gradient(to right, var(--down-color), #888, var(--up-color));
      border-radius: 3px;
      margin-bottom: 12px;
    }
    .range-thumb {
      position: absolute;
      width: 14px; height: 14px;
      background: #fff;
      border: 3px solid;
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .range-labels { display: flex; justify-content: space-between; font-size: 12px; }
    .range-low { color: var(--down-color); font-weight: 500; }
    .range-high { color: var(--up-color); font-weight: 500; }

    .footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--card-border);
    }
    .update-time {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      display: flex; align-items: center; gap: 6px;
    }
    .update-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .disclaimer { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.6; }
  `;
}
