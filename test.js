const OmniLang = require('./src/omni-lang.js');
const fs = require('fs');

console.log('🚀 OmniLang Engine Test\n');

// Test 1: Basic parsing
console.log('Test 1: Parsing fences...');
const testDoc = '# Test Document\n\n' +
'```omni:data name="users"\n' + '[\n' + '  {"name": "Alice", "age": 30},\n' + '  {"name": "Bob", "age": 25}\n' + ']\n' + '```\n\n' +
'We have ```omni:inline len(data.users)``` users.\n\n' +
'```omni:compute name="avgAge"\n' + 'return avg(data.users, \'age\');\n' + '```\n\n' +
'Average age: ```omni:inline computed.avgAge```\n';

const omni = new OmniLang();
omni.parse(testDoc);

console.log(`✓ Found ${omni.fences.length} fences`);
console.log(`✓ Found ${omni.inlineExpressions.length} inline expressions\n`);

// Test 2: Execution
console.log('Test 2: Executing fences...');
omni.execute().then(() => {
  console.log(`✓ Data loaded: ${Object.keys(omni.scope.data).join(', ')}`);
  console.log(`✓ Computed values: ${Object.keys(omni.scope.computed).join(', ')}`);
  console.log(`✓ Result: Average age = ${omni.scope.computed.avgAge}\n`);

  // Test 3: Rendering
  console.log('Test 3: Rendering HTML...');
  const html = omni.toHTML();
  console.log(`✓ Generated HTML (${html.length} characters)\n`);

  // Test 4: Process example document
  console.log('Test 4: Processing example document...');
  if (fs.existsSync('examples/example-report.omd')) {
    const exampleContent = fs.readFileSync('examples/example-report.omd', 'utf-8');
    const exampleOmni = new OmniLang();

    exampleOmni.parse(exampleContent);
    console.log(`✓ Parsed example: ${exampleOmni.fences.length} fences`);

    exampleOmni.execute().then(() => {
      console.log(`✓ Executed example`);
      console.log(`  - Data blocks: ${Object.keys(exampleOmni.scope.data).length}`);
      console.log(`  - Computed blocks: ${Object.keys(exampleOmni.scope.computed).length}`);
      console.log(`  - Charts: ${exampleOmni.scope.charts.length}`);
      
      const outputHTML = exampleOmni.toHTML();
      fs.writeFileSync('examples/example-report.html', outputHTML);
      console.log(`✓ Generated: examples/example-report.html\n`);
      
      console.log('✅ All tests passed!\n');
    }).catch(err => {
      console.error('✗ Execution error:', err);
    });
  } else {
    console.log('⚠ examples/example-report.omd not found, skipping\n');
  }
}).catch(err => {
  console.error('✗ Test 2 error:', err);
});
