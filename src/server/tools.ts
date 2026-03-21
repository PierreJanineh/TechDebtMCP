/**
 * MCP Tool definitions for Tech Debt MCP
 * Centralized tool schemas for better organization and maintainability
 */

export const TOOL_DEFINITIONS = [
  {
    name: 'analyze_project',
    description: 'Analyze an entire project for technical debt. Scans all supported files and returns a comprehensive report with issues, metrics, and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        languages: { type: 'array', items: { type: 'string' }, description: 'Optional: specific languages to analyze' },
        categories: { type: 'array', items: { type: 'string' }, description: 'Optional: filter by debt categories' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Optional: minimum severity level' },
        maxFiles: { type: 'integer', minimum: 1, description: 'Optional: maximum number of files to analyze (minimum: 1)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'analyze_file',
    description: 'Analyze a single file for technical debt issues.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to analyze' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_debt_summary',
    description: 'Get a quick summary of technical debt in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_sqale_metrics',
    description: 'Get SQALE technical debt metrics including remediation time, debt ratio, and rating.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        developmentTime: { type: 'number', description: 'Optional: estimated development time in hours for debt ratio calculation' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_supported_languages',
    description: 'List all programming languages supported by the analyzer.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_recommendations',
    description: 'Get prioritized recommendations for addressing technical debt.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        limit: { type: 'integer', minimum: 1, description: 'Optional: maximum number of recommendations to return (default: 5, minimum: 1)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_issues_by_severity',
    description: 'Get all issues of a specific severity level.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Severity level to filter by' },
      },
      required: ['path', 'severity'],
    },
  },
  {
    name: 'get_issues_by_category',
    description: 'Get all issues of a specific category.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        category: { type: 'string', enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'], description: 'Category to filter by' },
      },
      required: ['path', 'category'],
    },
  },
  {
    name: 'add_custom_rule',
    description: 'Add a custom pattern-based tech debt rule.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique identifier for the rule' },
        pattern: { type: 'string', description: 'Regex pattern to match' },
        message: { type: 'string', description: 'Issue title/message' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Issue severity level' },
        category: { type: 'string', enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'], description: 'Debt category' },
        suggestion: { type: 'string', description: 'Optional: how to fix the issue' },
        languages: { type: 'array', items: { type: 'string' }, description: 'Optional: apply only to specific languages' },
        flags: { type: 'string', description: 'Optional: regex flags (g, i, m, s, etc.)' },
      },
      required: ['id', 'pattern', 'message', 'severity', 'category'],
    },
  },
  {
    name: 'remove_custom_rule',
    description: 'Remove a custom rule by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the rule to remove' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_custom_rules',
    description: 'List all active custom rules with their statistics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'execute_custom_rules',
    description: 'Execute all custom rules against code or a file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to analyze' },
        code: { type: 'string', description: 'Code content to analyze (alternative to path)' },
        language: { type: 'string', description: 'Optional: programming language for filtering rules' },
      },
    },
  },
  {
    name: 'validate_custom_pattern',
    description: 'Validate a custom pattern before adding it as a rule.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique identifier for the rule' },
        pattern: { type: 'string', description: 'Regex pattern to validate' },
        message: { type: 'string', description: 'Issue title/message' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Issue severity level' },
        category: { type: 'string', enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'], description: 'Debt category' },
      },
      required: ['id', 'pattern', 'message', 'severity', 'category'],
    },
  },
  {
    name: 'check_dependencies',
    description: 'Analyze project dependencies across multiple package managers.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        includeDev: { type: 'boolean', description: 'Optional: include development dependencies (default: true)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'validate_config',
    description: 'Validate a .techdebtrc.json configuration file for syntax and schema correctness.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory or directly to a .techdebtrc.json file' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_vulnerability_report',
    description: 'Generate an offline dependency report listing all project dependencies for vulnerability review. Note: actual CVE lookups require Phase 2b online integration.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the project root directory' },
        includeDev: { type: 'boolean', description: 'Optional: include development dependencies (default: false)' },
      },
      required: ['path'],
    },
  },
] as const;
