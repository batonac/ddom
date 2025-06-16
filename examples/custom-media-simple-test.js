// Simple test for @custom-media functionality
import DDOM from '../lib/dist/index.js';

console.log('Testing @custom-media functionality...');

// Test configuration with custom media
const testConfig = {
    document: {
        body: {
            style: {
                padding: '2em',
                fontFamily: 'Arial, sans-serif',
                
                // Define custom media queries
                '@custom-media --narrow': '(max-width: 600px)',
                '@custom-media --wide': '(min-width: 1200px)',
                '@custom-media --modern': '(color), (hover)',
                '@custom-media --always': 'true',
                '@custom-media --never': 'false',
                
                // Use custom media queries
                '@media (--narrow)': {
                    backgroundColor: '#ffeb3b',
                    fontSize: '14px'
                },
                
                '@media (--wide)': {
                    backgroundColor: '#e3f2fd',
                    fontSize: '18px'
                },
                
                '@media (--modern) and (width > 800px)': {
                    color: 'green',
                    fontWeight: 'bold'
                },
                
                '@media (--always)': {
                    border: '2px solid red'
                },
                
                '@media (--never)': {
                    border: '2px solid blue' // Should not appear
                }
            },
            children: [
                {
                    tagName: 'h1',
                    textContent: 'Custom Media Test',
                    style: {
                        '@custom-media --title-small': '(max-width: 480px)',
                        '@media (--title-small)': {
                            fontSize: '1.2em',
                            textAlign: 'center'
                        }
                    }
                },
                {
                    tagName: 'p',
                    textContent: 'This page tests @custom-media rule functionality. Check the console for generated CSS.',
                    style: {
                        marginBottom: '2em'
                    }
                },
                {
                    tagName: 'div',
                    id: 'test-box',
                    textContent: 'Test Box',
                    style: {
                        padding: '1em',
                        border: '1px solid #ccc',
                        margin: '1em 0',
                        
                        '@custom-media --box-small': '(max-width: 500px)',
                        '@media (--box-small)': {
                            backgroundColor: 'lightcoral',
                            textAlign: 'center'
                        }
                    }
                }
            ]
        }
    }
};

// Initialize DDOM
const app = DDOM(testConfig);

// Log results after a short delay
setTimeout(() => {
    console.log('=== Custom Media Test Results ===');
    
    // Check if styles were applied
    const sheets = document.adoptedStyleSheets;
    if (sheets && sheets.length > 0) {
        console.log('Generated CSS Rules:');
        for (let i = 0; i < sheets[0].cssRules.length; i++) {
            const rule = sheets[0].cssRules[i];
            console.log(`${i + 1}. ${rule.cssText}`);
        }
    } else {
        console.log('No adopted stylesheets found');
    }
    
    console.log('=== End Test Results ===');
}, 100);

export default testConfig;