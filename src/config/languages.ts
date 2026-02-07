import { LanguageConfig, SupportedLanguage } from '../types/index.js';

/**
 * Language configurations for all supported languages
 */
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    name: 'JavaScript',
    extensions: ['.js', '.mjs', '.cjs', '.jsx'],
    packageFiles: ['package.json'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'console-log',
      'debugger',
      'eslint-disable',
      'eval-usage',
      'var-usage',
      'callback-hell',
      'promise-no-catch',
    ],
  },

  typescript: {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    packageFiles: ['package.json', 'tsconfig.json'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'any-type',
      'ts-ignore',
      'ts-expect-error',
      'non-null-assertion',
      'type-assertion',
      'console-log',
      'debugger',
      'eslint-disable',
    ],
  },

  python: {
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    packageFiles: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    commentPatterns: {
      single: ['#'],
      multiStart: ['"""', "'''"],
      multiEnd: ['"""', "'''"],
    },
    todoPatterns: [
      /#\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'bare-except',
      'pass-statement',
      'global-usage',
      'exec-usage',
      'missing-type-hints',
      'print-statement',
      'noqa-comment',
    ],
  },

  java: {
    name: 'Java',
    extensions: ['.java'],
    packageFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'deprecated-annotation',
      'suppress-warnings',
      'system-out',
      'system-err',
      'printStackTrace',
      'empty-catch',
      'raw-types',
      'unchecked-cast',
    ],
  },

  swift: {
    name: 'Swift',
    extensions: ['.swift'],
    packageFiles: ['Package.swift', 'Podfile', 'Cartfile'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|MARK)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|MARK)[\s:]/gi,
    ],
    specificChecks: [
      'force-unwrap',
      'force-cast',
      'force-try',
      'implicitly-unwrapped',
      'print-statement',
      'nslog-statement',
      'swiftlint-disable',
      'any-object',
      'class-only-protocol',
    ],
  },

  kotlin: {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    packageFiles: ['build.gradle.kts', 'build.gradle', 'pom.xml'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'force-unwrap',
      'suppress-annotation',
      'println-statement',
      'deprecated-annotation',
      'unchecked-cast',
      'platform-type',
      'lateinit-abuse',
      'mutable-collection-return',
    ],
  },

  objectivec: {
    name: 'Objective-C',
    extensions: ['.m', '.mm', '.h'],
    packageFiles: ['Podfile', 'Cartfile'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|MARK)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|MARK)[\s:]/gi,
      /#pragma\s+mark\s+-?\s*/gi,
    ],
    specificChecks: [
      'nslog-statement',
      'retain-cycle-risk',
      'deprecated-method',
      'arc-bridge-cast',
      'magic-numbers',
      'long-method',
      'massive-view-controller',
    ],
  },

  cpp: {
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.h++', '.hh'],
    packageFiles: ['CMakeLists.txt', 'conanfile.txt', 'vcpkg.json', 'Makefile'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'raw-pointer',
      'manual-memory',
      'c-style-cast',
      'goto-statement',
      'macro-abuse',
      'iostream-sync',
      'deprecated-headers',
      'using-namespace-std',
      'magic-numbers',
    ],
  },

  c: {
    name: 'C',
    extensions: ['.c', '.h'],
    packageFiles: ['CMakeLists.txt', 'Makefile', 'configure.ac'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'malloc-no-free',
      'goto-statement',
      'magic-numbers',
      'unsafe-functions',
      'missing-null-check',
      'buffer-overflow-risk',
      'implicit-declaration',
    ],
  },

  csharp: {
    name: 'C#',
    extensions: ['.cs'],
    packageFiles: ['*.csproj', '*.sln', 'packages.config', 'Directory.Build.props'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'console-writeline',
      'debug-writeline',
      'pragma-disable',
      'obsolete-attribute',
      'suppress-message',
      'empty-catch',
      'dynamic-type',
      'async-void',
      'dispose-not-called',
    ],
  },

  go: {
    name: 'Go',
    extensions: ['.go'],
    packageFiles: ['go.mod', 'go.sum'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'ignored-error',
      'blank-import',
      'fmt-print',
      'panic-usage',
      'init-function',
      'global-variable',
      'nolint-comment',
    ],
  },

  rust: {
    name: 'Rust',
    extensions: ['.rs'],
    packageFiles: ['Cargo.toml', 'Cargo.lock'],
    commentPatterns: {
      single: ['//'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'unwrap-usage',
      'expect-usage',
      'unsafe-block',
      'allow-attribute',
      'clippy-allow',
      'panic-macro',
      'println-macro',
      'dbg-macro',
      'todo-macro',
      'unimplemented-macro',
    ],
  },

  ruby: {
    name: 'Ruby',
    extensions: ['.rb', '.rake', '.gemspec'],
    packageFiles: ['Gemfile', 'Gemfile.lock', '*.gemspec'],
    commentPatterns: {
      single: ['#'],
      multiStart: ['=begin'],
      multiEnd: ['=end'],
    },
    todoPatterns: [
      /#\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'puts-statement',
      'binding-pry',
      'rubocop-disable',
      'eval-usage',
      'global-variable',
      'class-variable',
      'rescue-exception',
    ],
  },

  php: {
    name: 'PHP',
    extensions: ['.php', '.phtml', '.php5', '.php7'],
    packageFiles: ['composer.json', 'composer.lock'],
    commentPatterns: {
      single: ['//', '#'],
      multiStart: ['/*'],
      multiEnd: ['*/'],
    },
    todoPatterns: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
      /#\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]/gi,
    ],
    specificChecks: [
      'var-dump',
      'print-r',
      'die-exit',
      'eval-usage',
      'error-suppression',
      'global-usage',
      'extract-usage',
      'phpcs-ignore',
    ],
  },
};

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

/**
 * Detect language from file extension
 */
export function detectLanguageFromExtension(filePath: string): SupportedLanguage | null {
  const ext = getFileExtension(filePath);

  for (const [lang, config] of Object.entries(LANGUAGE_CONFIGS)) {
    if (config.extensions.includes(ext)) {
      return lang as SupportedLanguage;
    }
  }

  return null;
}

/**
 * Get language config
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[language];
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return Object.keys(LANGUAGE_CONFIGS) as SupportedLanguage[];
}

/**
 * Get languages by extension
 */
export function getAllExtensions(): string[] {
  const extensions = new Set<string>();
  for (const config of Object.values(LANGUAGE_CONFIGS)) {
    config.extensions.forEach(ext => extensions.add(ext));
  }
  return Array.from(extensions);
}
