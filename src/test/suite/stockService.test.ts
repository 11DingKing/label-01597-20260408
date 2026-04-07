import * as assert from 'assert';
import { StockService } from '../../stockService';

suite('StockService Test Suite', () => {
  test('validateCode - 有效的沪市代码', () => {
    assert.strictEqual(StockService.validateCode('sh600519'), true);
    assert.strictEqual(StockService.validateCode('SH600519'), true);
    assert.strictEqual(StockService.validateCode('sh000001'), true);
  });

  test('validateCode - 有效的深市代码', () => {
    assert.strictEqual(StockService.validateCode('sz000001'), true);
    assert.strictEqual(StockService.validateCode('SZ300750'), true);
    assert.strictEqual(StockService.validateCode('sz399001'), true);
  });

  test('validateCode - 无效的代码', () => {
    assert.strictEqual(StockService.validateCode('hk00700'), false);
    assert.strictEqual(StockService.validateCode('us12345'), false);
    assert.strictEqual(StockService.validateCode('600519'), false);
    assert.strictEqual(StockService.validateCode('sh12345'), false);
    assert.strictEqual(StockService.validateCode(''), false);
  });

  test('formatCode - 格式化代码', () => {
    assert.strictEqual(StockService.formatCode('SH600519'), 'sh600519');
    assert.strictEqual(StockService.formatCode('  sz000001  '), 'sz000001');
  });

  test('formatPrice - 格式化价格', () => {
    assert.strictEqual(StockService.formatPrice(100), '100.00');
    assert.strictEqual(StockService.formatPrice(99.5), '99.50');
    assert.strictEqual(StockService.formatPrice(1234.567), '1234.57');
  });

  test('formatPercent - 格式化涨跌幅', () => {
    assert.strictEqual(StockService.formatPercent(5.5), '+5.50%');
    assert.strictEqual(StockService.formatPercent(-3.2), '-3.20%');
    assert.strictEqual(StockService.formatPercent(0), '+0.00%');
  });

  test('formatVolume - 格式化成交量', () => {
    assert.strictEqual(StockService.formatVolume(100), '100手');
    assert.strictEqual(StockService.formatVolume(10000), '1.00万手');
    assert.strictEqual(StockService.formatVolume(50000), '5.00万手');
  });

  test('formatTurnover - 格式化成交额', () => {
    assert.strictEqual(StockService.formatTurnover(1000), '1000.00');
    assert.strictEqual(StockService.formatTurnover(50000), '5.00万');
    assert.strictEqual(StockService.formatTurnover(100000000), '1.00亿');
  });
});
