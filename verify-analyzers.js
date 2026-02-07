#!/usr/bin/env node

// Quick verification that analyzers work
const { GoAnalyzer } = require('./dist/analyzers/goAnalyzer.js');
const { RustAnalyzer } = require('./dist/analyzers/rustAnalyzer.js');
const { RubyAnalyzer } = require('./dist/analyzers/rubyAnalyzer.js');
const { PhpAnalyzer } = require('./dist/analyzers/phpAnalyzer.js');

async function test() {
  console.log('Testing Go Analyzer...');
  const goAnalyzer = new GoAnalyzer();
  const goResult = await goAnalyzer.analyze('test.go', 'panic("error")');
  console.log(`✓ Go Analyzer found ${goResult.issues.length} issues`);

  console.log('\nTesting Rust Analyzer...');
  const rustAnalyzer = new RustAnalyzer();
  const rustResult = await rustAnalyzer.analyze('test.rs', 'let x = value.unwrap();');
  console.log(`✓ Rust Analyzer found ${rustResult.issues.length} issues`);

  console.log('\nTesting Ruby Analyzer...');
  const rubyAnalyzer = new RubyAnalyzer();
  const rubyResult = await rubyAnalyzer.analyze('test.rb', 'binding.pry');
  console.log(`✓ Ruby Analyzer found ${rubyResult.issues.length} issues`);

  console.log('\nTesting PHP Analyzer...');
  const phpAnalyzer = new PhpAnalyzer();
  const phpResult = await phpAnalyzer.analyze('test.php', 'eval($code);');
  console.log(`✓ PHP Analyzer found ${phpResult.issues.length} issues`);

  console.log('\n✅ All analyzers working!');
}

test().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

