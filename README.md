# A股股票关注 - VS Code 插件

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-1.74%2B-blue.svg" alt="VS Code">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

> 在 VS Code 中实时关注 A 股股票行情，做最好用的投资插件！

**投资有风险，入市需谨慎！**

## ✨ 功能特性

### 📊 实时行情

- **侧边栏股票列表** - 专属活动栏图标，实时显示股票涨跌
- **智能分组** - 自动按指数、沪市、深市分组显示
- **涨跌颜色** - 上涨红色 📈、下跌绿色 📉，一目了然
- **丰富图标** - 涨幅超5%显示🚀，跌幅超5%显示💥

### 💹 状态栏显示

- VS Code 启动后自动在底部状态栏显示关注的股票
- 支持自定义显示模板
- 悬停显示详细信息

### 📈 股票详情

- 现代化 UI 设计
- 日内分时走势图（SVG 渲染，基于新浪财经分时数据 API）
- 价格区间可视化
- 完整的成交数据

### 🛠️ 便捷操作

- **快速添加** - 常用 A 股快速选择，支持手动输入
- **排序功能** - 按涨幅升序/降序排列
- **分组切换** - 一键切换分组/平铺显示
- **自动刷新** - 可配置刷新间隔（默认 10 秒）

## 📦 安装

### 方式一：从 VSIX 安装（推荐）

1. 下载 `a-stock-watcher-1.0.0.vsix` 文件
2. 打开 VS Code，按 `Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows/Linux）
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件
5. 重新加载 VS Code

### 方式二：从源码安装

```bash

# 1. 安装依赖
npm install

# 2. 编译
npm run compile

# 3. 打包（会自动包含运行时依赖 iconv-lite）
npm run package

# 4. 安装生成的 .vsix 文件（参考方式一）
```

> 💡 打包产物 `.vsix` 已包含必要的运行时依赖（iconv-lite），安装后即可正常使用。

## 🧪 开发与测试

### 开发环境

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式（自动编译）
npm run watch

# 代码检查
npm run lint

# 自动修复 lint 问题
npm run lint:fix
```

### 调试运行

1. 在 VS Code 中打开项目
2. 按 `F5` 启动调试
3. 会打开一个新的 VS Code 窗口（Extension Development Host）
4. 在新窗口中测试插件功能

### 运行测试

```bash
# 运行单元测试
npm run test
```

测试文件位于 `src/test/` 目录，使用 Mocha 测试框架。

### 打包发布

```bash
# 安装 vsce（如未安装）
npm install -g @vscode/vsce

# 打包
npm run package
# 或
vsce package
```

## 🚀 快速开始

### 添加股票

1. 点击活动栏的「A股关注」图标（📈）
2. 点击面板顶部的 ➕ 按钮
3. 选择常用股票或手动输入代码

### 股票代码格式

| 市场     | 格式         | 示例                   |
| -------- | ------------ | ---------------------- |
| 沪市     | sh + 6位代码 | `sh600519`（贵州茅台） |
| 深市     | sz + 6位代码 | `sz000001`（平安银行） |
| 上证指数 | sh000001     | 上证综合指数           |
| 深证成指 | sz399001     | 深证成分指数           |
| 创业板指 | sz399006     | 创业板指数             |

> ⚠️ 本插件仅支持 A 股（沪深两市），不支持港股、美股等其他市场。

### 常用操作

| 操作         | 说明              |
| ------------ | ----------------- |
| 点击股票     | 查看详情页        |
| 悬停股票     | 显示详细数据      |
| 右键股票     | 删除/添加到状态栏 |
| 顶部刷新按钮 | 手动刷新数据      |
| 顶部分组按钮 | 切换分组/平铺     |

## ⚙️ 配置选项

在 VS Code 设置中搜索 `astock`：

| 配置项                     | 类型    | 默认值                                | 说明               |
| -------------------------- | ------- | ------------------------------------- | ------------------ |
| `astock.stocks`            | array   | `["sh000001", "sz399001"]`            | 关注的股票代码     |
| `astock.refreshInterval`   | number  | `10`                                  | 刷新间隔（秒，≥5） |
| `astock.showStatusBar`     | boolean | `true`                                | 状态栏显示         |
| `astock.statusBarStocks`   | array   | `["sh000001"]`                        | 状态栏股票         |
| `astock.statusBarTemplate` | string  | `${icon} ${name} ${price} ${percent}` | 状态栏模板         |
| `astock.enableGroup`       | boolean | `true`                                | 分组显示           |
| `astock.sortBy`            | string  | `none`                                | 排序方式           |
| `astock.showPercent`       | boolean | `true`                                | 显示涨跌幅         |
| `astock.showPrice`         | boolean | `true`                                | 显示价格           |

### 状态栏模板变量

| 变量         | 说明     |
| ------------ | -------- |
| `${icon}`    | 涨跌图标 |
| `${name}`    | 股票名称 |
| `${code}`    | 股票代码 |
| `${price}`   | 当前价格 |
| `${percent}` | 涨跌幅   |
| `${change}`  | 涨跌额   |

### 配置示例

```json
{
  "astock.stocks": ["sh000001", "sz399001", "sh600519", "sz300750"],
  "astock.refreshInterval": 15,
  "astock.enableGroup": true,
  "astock.sortBy": "changeDesc",
  "astock.statusBarStocks": ["sh000001", "sh600519"],
  "astock.statusBarTemplate": "${icon} ${name} ${percent}"
}
```

## 📋 命令列表

按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) 打开命令面板，输入 `A股关注`：

| 命令                    | 说明             |
| ----------------------- | ---------------- |
| A股关注: 添加股票       | 添加新股票       |
| A股关注: 删除股票       | 删除已有股票     |
| A股关注: 刷新全部       | 刷新所有数据     |
| A股关注: 查看股票详情   | 打开详情页       |
| A股关注: 按涨幅降序排列 | 涨幅高到低       |
| A股关注: 按涨幅升序排列 | 涨幅低到高       |
| A股关注: 默认排序       | 恢复默认顺序     |
| A股关注: 切换分组显示   | 分组/平铺切换    |
| A股关注: 添加到状态栏   | 添加到底部状态栏 |

## 📁 项目结构

```
a-stock-watcher/
├── src/
│   ├── extension.ts      # 插件入口，命令注册
│   ├── stockService.ts   # 股票数据服务（API 请求）
│   ├── stockProvider.ts  # 树视图数据提供者
│   ├── statusBar.ts      # 状态栏管理
│   ├── logger.ts         # 统一日志管理
│   ├── types.ts          # 类型定义
│   ├── webview/
│   │   └── stockDetailView.ts  # 股票详情页 Webview
│   └── test/
│       ├── runTest.ts    # 测试入口
│       └── suite/
│           ├── index.ts  # 测试套件
│           └── stockService.test.ts  # 单元测试
├── out/                  # 编译输出
├── .eslintrc.json        # ESLint 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目配置
```

## 📊 数据来源

本插件使用新浪财经公开 API 获取股票数据：
- 实时行情：`hq.sinajs.cn`
- 分时数据：`quotes.sina.cn`

## ⚠️ 注意事项

1. 股票数据存在延迟，**不作为投资依据**
2. A 股交易时间：工作日 9:30-11:30, 13:00-15:00
3. 非交易时间数据不会更新
4. 建议刷新间隔不要低于 5 秒
5. 网络请求失败会自动重试（最多 2 次）

## 📄 License

MIT

---

**股市有风险，投资需谨慎。本插件仅供学习和参考使用。**
