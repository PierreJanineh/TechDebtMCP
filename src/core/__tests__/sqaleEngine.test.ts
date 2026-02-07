import { SQALEEngine } from '../sqaleEngine.js';
import { TechDebtIssue } from '../../types/index.js';

describe('SQALEEngine', () => {
  const engine = new SQALEEngine();

  it('calculates remediation time for effort levels', () => {
    expect(engine.getRemediationTime('trivial')).toBe(5);
    expect(engine.getRemediationTime('small')).toBe(30);
    expect(engine.getRemediationTime('medium')).toBe(120);
    expect(engine.getRemediationTime('large')).toBe(240);
    expect(engine.getRemediationTime('xlarge')).toBe(480);
  });

  it('calculates total remediation time for single issue', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'medium',
        file: 'test.ts',
        title: 'Test Issue',
        description: 'Test',
        effort: 'small',
        rule: 'test-rule',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.totalRemediationTime).toBe(30);
  });

  it('calculates total remediation time for multiple issues', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'medium',
        file: 'test.ts',
        title: 'Issue 1',
        description: 'Test',
        effort: 'small',
        rule: 'test-1',
      },
      {
        id: '2',
        category: 'security',
        severity: 'high',
        file: 'test.ts',
        title: 'Issue 2',
        description: 'Test',
        effort: 'medium',
        rule: 'test-2',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.totalRemediationTime).toBe(150); // 30 + 120
  });

  it('handles empty issues array', () => {
    const metrics = engine.calculateMetrics([]);
    expect(metrics.totalRemediationTime).toBe(0);
  });

  it('defaults to small effort if not specified', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'low',
        file: 'test.ts',
        title: 'Issue',
        description: 'Test',
        rule: 'test',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.totalRemediationTime).toBe(30);
  });

  it('returns correct rating for debt ratios', () => {
    expect(engine.getRating(0)).toBe('A');
    expect(engine.getRating(5)).toBe('A');
    expect(engine.getRating(6)).toBe('B');
    expect(engine.getRating(10)).toBe('B');
    expect(engine.getRating(11)).toBe('C');
    expect(engine.getRating(20)).toBe('C');
    expect(engine.getRating(21)).toBe('D');
    expect(engine.getRating(50)).toBe('D');
    expect(engine.getRating(51)).toBe('E');
  });

  it('formats time correctly', () => {
    expect(engine.formatTime(0)).toBe('0m');
    expect(engine.formatTime(45)).toBe('45m');
    expect(engine.formatTime(60)).toBe('1h');
    expect(engine.formatTime(90)).toBe('1h 30m');
    expect(engine.formatTime(1440)).toBe('1d');
    expect(engine.formatTime(1500)).toBe('1d 1h');
  });

  it('calculates debt ratio correctly', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'low',
        file: 'test.ts',
        title: 'Issue',
        description: 'Test',
        effort: 'small', // 30 minutes
        rule: 'test',
      },
    ];

    // 30 / 300 * 100 = 10%
    const metrics = engine.calculateMetrics(issues, 300);
    expect(metrics.debtRatio).toBe(10);
  });

  it('returns 0 debt ratio when development time not provided', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'low',
        file: 'test.ts',
        title: 'Issue',
        description: 'Test',
        effort: 'small',
        rule: 'test',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.debtRatio).toBe(0);
  });

  it('breaks down by category', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'medium',
        file: 'test.ts',
        title: 'Issue 1',
        description: 'Test',
        effort: 'small',
        rule: 'test',
      },
      {
        id: '2',
        category: 'security',
        severity: 'high',
        file: 'test.ts',
        title: 'Issue 2',
        description: 'Test',
        effort: 'medium',
        rule: 'test',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.byCategory['code-quality']).toBe(30);
    expect(metrics.byCategory['security']).toBe(120);
  });

  it('breaks down by severity', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'code-quality',
        severity: 'low',
        file: 'test.ts',
        title: 'Issue 1',
        description: 'Test',
        effort: 'small',
        rule: 'test',
      },
      {
        id: '2',
        category: 'code-quality',
        severity: 'critical',
        file: 'test.ts',
        title: 'Issue 2',
        description: 'Test',
        effort: 'large',
        rule: 'test',
      },
    ];

    const metrics = engine.calculateMetrics(issues);
    expect(metrics.bySeverity['low']).toBe(30);
    expect(metrics.bySeverity['critical']).toBe(240);
  });

  it('uses custom effort mapping', () => {
    const customEngine = new SQALEEngine({ small: 15 });
    expect(customEngine.getRemediationTime('small')).toBe(15);
    expect(customEngine.getRemediationTime('medium')).toBe(120);
  });

  it('calculates complete metrics', () => {
    const issues: TechDebtIssue[] = [
      {
        id: '1',
        category: 'security',
        severity: 'critical',
        file: 'test.ts',
        title: 'SQL Injection',
        description: 'Test',
        effort: 'medium',
        rule: 'sql-injection',
      },
      {
        id: '2',
        category: 'code-quality',
        severity: 'medium',
        file: 'test.ts',
        title: 'Long function',
        description: 'Test',
        effort: 'small',
        rule: 'long-function',
      },
    ];

    const metrics = engine.calculateMetrics(issues, 1200);

    expect(metrics.totalRemediationTime).toBe(150);
    expect(metrics.formattedTime).toBe('2h 30m');
    expect(metrics.debtRatio).toBe(12.5);
    expect(metrics.rating).toBe('C');
  });
});

