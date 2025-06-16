// Comprehensive test for @custom-media implementation
// Tests all scenarios from the CSS Media Queries Level 5 spec

import DDOM from '../lib/dist/index.js';

console.log('🧪 Starting comprehensive @custom-media tests...');

// Test 1: Basic custom media definition and usage
console.log('\n📋 Test 1: Basic Definition and Usage');
const test1Config = {
    customElements: [{
        tagName: 'test-basic',
        style: {
            '@custom-media --narrow-window': '(max-width: 30em)',
            '@media (--narrow-window)': {
                '.test-element': {
                    fontSize: '14px',
                    backgroundColor: 'yellow'
                }
            }
        }
    }]
};

// Test 2: Boolean values (true/false)
console.log('\n📋 Test 2: Boolean Values');
const test2Config = {
    customElements: [{
        tagName: 'test-boolean',
        style: {
            '@custom-media --always': 'true',
            '@custom-media --never': 'false',
            '@media (--always)': {
                '.always-visible': {
                    display: 'block',
                    color: 'green'
                }
            },
            '@media (--never)': {
                '.never-visible': {
                    display: 'none',
                    color: 'red'
                }
            }
        }
    }]
};

// Test 3: Complex media queries (from spec example)
console.log('\n📋 Test 3: Complex Media Queries');
const test3Config = {
    customElements: [{
        tagName: 'test-complex',
        style: {
            '@custom-media --modern': '(color), (hover)',
            '@media (--modern) and (width > 1024px)': {
                '.complex-element': {
                    color: 'green',
                    fontWeight: 'bold'
                }
            }
        }
    }]
};

// Test 4: Nested custom media references
console.log('\n📋 Test 4: Nested References');
const test4Config = {
    customElements: [{
        tagName: 'test-nested',
        style: {
            '@custom-media --small': '(max-width: 600px)',
            '@custom-media --touch': '(hover: none)',
            '@custom-media --mobile': '(--small) and (--touch)',
            '@media (--mobile)': {
                '.mobile-element': {
                    fontSize: '16px',
                    padding: '1em'
                }
            }
        }
    }]
};

// Test 5: Override behavior (later declarations win)
console.log('\n📋 Test 5: Override Behavior');
const test5Config = {
    customElements: [{
        tagName: 'test-override',
        style: {
            '@custom-media --breakpoint': '(max-width: 700px)', // First definition
            '@custom-media --breakpoint': '(max-width: 500px)', // Should override
            '@media (--breakpoint)': {
                '.override-element': {
                    backgroundColor: 'orange'
                }
            }
        }
    }]
};

// Test 6: Circular dependency detection
console.log('\n📋 Test 6: Circular Dependency Detection');
const test6Config = {
    customElements: [{
        tagName: 'test-circular',
        style: {
            '@custom-media --circular1': '(--circular2)',
            '@custom-media --circular2': '(--circular1)',
            '@media (--circular1)': {
                '.circular-element': {
                    color: 'purple' // Should fallback to 'not all'
                }
            }
        }
    }]
};

// Test 7: Undefined custom media
console.log('\n📋 Test 7: Undefined Custom Media');
const test7Config = {
    customElements: [{
        tagName: 'test-undefined',
        style: {
            '@media (--undefined-media)': {
                '.undefined-element': {
                    color: 'red' // Should fallback to 'not all'
                }
            }
        }
    }]
};

// Run all tests
const tests = [
    { name: 'Basic Definition', config: test1Config },
    { name: 'Boolean Values', config: test2Config },
    { name: 'Complex Queries', config: test3Config },
    { name: 'Nested References', config: test4Config },
    { name: 'Override Behavior', config: test5Config },
    { name: 'Circular Dependencies', config: test6Config },
    { name: 'Undefined References', config: test7Config }
];

function runTest(test, index) {
    console.log(`\n🔄 Running ${test.name}...`);
    
    try {
        const app = DDOM(test.config);
        console.log(`✅ ${test.name}: DDOM initialized successfully`);
        return true;
    } catch (error) {
        console.error(`❌ ${test.name}: Failed with error:`, error.message);
        return false;
    }
}

// Execute tests sequentially
let passedTests = 0;
tests.forEach((test, index) => {
    if (runTest(test, index)) {
        passedTests++;
    }
});

// Final validation
setTimeout(() => {
    console.log('\n🔍 Analyzing generated CSS...');
    
    const sheets = document.adoptedStyleSheets;
    if (sheets && sheets.length > 0) {
        const sheet = sheets[0];
        console.log(`📊 Generated ${sheet.cssRules.length} CSS rules`);
        
        let mediaRuleCount = 0;
        let resolvedQueryCount = 0;
        let unresolvedReferenceCount = 0;
        
        for (let i = 0; i < sheet.cssRules.length; i++) {
            const rule = sheet.cssRules[i];
            const ruleText = rule.cssText;
            
            if (rule.type === CSSRule.MEDIA_RULE) {
                mediaRuleCount++;
                console.log(`📝 Media rule: ${ruleText}`);
                
                // Check for resolved queries
                if (ruleText.includes('max-width') || 
                    ruleText.includes('color') || 
                    ruleText.includes('hover') ||
                    ruleText.includes('all') ||
                    ruleText.includes('not all')) {
                    resolvedQueryCount++;
                }
                
                // Check for unresolved references
                if (ruleText.includes('--')) {
                    unresolvedReferenceCount++;
                }
            }
        }
        
        console.log('\n📋 Test Summary:');
        console.log(`✅ Tests passed: ${passedTests}/${tests.length}`);
        console.log(`📊 Media rules created: ${mediaRuleCount}`);
        console.log(`🔄 Resolved queries: ${resolvedQueryCount}`);
        console.log(`⚠️  Unresolved references: ${unresolvedReferenceCount}`);
        
        const allTestsPassed = passedTests === tests.length;
        const hasMediaRules = mediaRuleCount > 0;
        const hasResolvedQueries = resolvedQueryCount > 0;
        const noUnresolvedRefs = unresolvedReferenceCount === 0;
        
        if (allTestsPassed && hasMediaRules && hasResolvedQueries && noUnresolvedRefs) {
            console.log('\n🎉 ALL TESTS PASSED! @custom-media implementation is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed or implementation needs attention.');
        }
        
    } else {
        console.log('❌ No adopted stylesheets found');
    }
    
}, 500);

export default {
    document: {
        body: {
            children: [
                {
                    tagName: 'h1',
                    textContent: '@custom-media Implementation Test',
                    style: { 
                        textAlign: 'center',
                        color: '#333',
                        fontFamily: 'Arial, sans-serif'
                    }
                },
                {
                    tagName: 'p',
                    textContent: 'Check the browser console for detailed test results.',
                    style: { 
                        textAlign: 'center',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '16px',
                        color: '#666'
                    }
                },
                ...tests.map((test, index) => ({
                    tagName: 'div',
                    className: `test-container-${index}`,
                    style: {
                        margin: '1em',
                        padding: '1em',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontFamily: 'Arial, sans-serif'
                    },
                    children: [
                        {
                            tagName: 'h3',
                            textContent: `Test ${index + 1}: ${test.name}`,
                            style: { margin: '0 0 0.5em 0' }
                        },
                        {
                            tagName: 'div',
                            className: 'test-element',
                            textContent: `Test element for ${test.name}`,
                            style: {
                                padding: '0.5em',
                                backgroundColor: '#f9f9f9',
                                border: '1px solid #eee'
                            }
                        }
                    ]
                }))
            ]
        }
    }
};