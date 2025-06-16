// Example demonstrating @custom-media rule usage with DDOM

export default {
    document: {
        body: {
            style: {
                fontFamily: 'Arial, sans-serif',
                padding: '2em',
                margin: '0',
                backgroundColor: '#f5f5f5',
                
                // Define reusable custom media queries
                '@custom-media --mobile': '(max-width: 768px)',
                '@custom-media --tablet': '(min-width: 769px) and (max-width: 1024px)',
                '@custom-media --desktop': '(min-width: 1025px)',
                '@custom-media --dark-mode': '(prefers-color-scheme: dark)',
                '@custom-media --reduced-motion': '(prefers-reduced-motion: reduce)',
                '@custom-media --modern-browser': '(color), (hover)',
                '@custom-media --always-active': 'true',
                '@custom-media --never-active': 'false',
                
                // Use custom media queries in responsive design
                '@media (--mobile)': {
                    padding: '1em',
                    fontSize: '14px'
                },
                
                '@media (--tablet)': {
                    padding: '1.5em',
                    fontSize: '16px'
                },
                
                '@media (--desktop)': {
                    padding: '2em',
                    fontSize: '18px'
                },
                
                '@media (--dark-mode)': {
                    backgroundColor: '#1a1a1a',
                    color: '#f0f0f0'
                },
                
                '@media (--always-active)': {
                    minHeight: '100vh'
                },
                
                // Complex combinations
                '@media (--modern-browser) and (--desktop)': {
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
            },
            children: [
                {
                    tagName: 'header',
                    style: {
                        '@custom-media --header-compact': '(max-height: 600px)',
                        
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '2em',
                        textAlign: 'center',
                        borderRadius: '8px',
                        marginBottom: '2em',
                        
                        '@media (--mobile)': {
                            padding: '1em',
                            fontSize: '14px'
                        },
                        
                        '@media (--header-compact)': {
                            padding: '1em'
                        },
                        
                        '@media (--dark-mode)': {
                            backgroundColor: '#0056b3'
                        }
                    },
                    children: [
                        {
                            tagName: 'h1',
                            textContent: 'DDOM @custom-media Demo',
                            style: {
                                margin: '0',
                                '@media (--mobile)': {
                                    fontSize: '1.5em'
                                }
                            }
                        }
                    ]
                },
                {
                    tagName: 'main',
                    style: {
                        maxWidth: '800px',
                        margin: '0 auto',
                        backgroundColor: 'white',
                        padding: '2em',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        
                        '@media (--mobile)': {
                            padding: '1em',
                            margin: '0 1em'
                        },
                        
                        '@media (--dark-mode)': {
                            backgroundColor: '#2a2a2a',
                            color: '#f0f0f0'
                        }
                    },
                    children: [
                        {
                            tagName: 'section',
                            style: {
                                marginBottom: '2em'
                            },
                            children: [
                                {
                                    tagName: 'h2',
                                    textContent: 'Responsive Grid Example',
                                    style: {
                                        color: '#333',
                                        '@media (--dark-mode)': {
                                            color: '#f0f0f0'
                                        }
                                    }
                                },
                                {
                                    tagName: 'div',
                                    className: 'grid-container',
                                    style: {
                                        display: 'grid',
                                        gap: '1em',
                                        
                                        '@media (--mobile)': {
                                            gridTemplateColumns: '1fr'
                                        },
                                        
                                        '@media (--tablet)': {
                                            gridTemplateColumns: 'repeat(2, 1fr)'
                                        },
                                        
                                        '@media (--desktop)': {
                                            gridTemplateColumns: 'repeat(3, 1fr)'
                                        }
                                    },
                                    children: [
                                        {
                                            tagName: 'div',
                                            className: 'grid-item',
                                            textContent: 'Item 1',
                                            style: {
                                                '@custom-media --grid-hover': '(hover: hover)',
                                                
                                                padding: '1em',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                border: '1px solid #dee2e6',
                                                
                                                '@media (--grid-hover)': {
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s ease'
                                                },
                                                
                                                '@media (--grid-hover)': {
                                                    ':hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                                                    }
                                                },
                                                
                                                '@media (--dark-mode)': {
                                                    backgroundColor: '#3a3a3a',
                                                    borderColor: '#555',
                                                    color: '#f0f0f0'
                                                }
                                            }
                                        },
                                        {
                                            tagName: 'div',
                                            className: 'grid-item',
                                            textContent: 'Item 2',
                                            style: {
                                                padding: '1em',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                border: '1px solid #dee2e6',
                                                
                                                '@media (--dark-mode)': {
                                                    backgroundColor: '#3a3a3a',
                                                    borderColor: '#555',
                                                    color: '#f0f0f0'
                                                }
                                            }
                                        },
                                        {
                                            tagName: 'div',
                                            className: 'grid-item',
                                            textContent: 'Item 3',
                                            style: {
                                                padding: '1em',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                border: '1px solid #dee2e6',
                                                
                                                '@media (--dark-mode)': {
                                                    backgroundColor: '#3a3a3a',
                                                    borderColor: '#555',
                                                    color: '#f0f0f0'
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            tagName: 'section',
                            children: [
                                {
                                    tagName: 'h2',
                                    textContent: 'Feature Information',
                                    style: {
                                        color: '#333',
                                        '@media (--dark-mode)': {
                                            color: '#f0f0f0'
                                        }
                                    }
                                },
                                {
                                    tagName: 'p',
                                    textContent: 'This page demonstrates the @custom-media rule implementation. Custom media queries allow you to define reusable media query aliases that can be used throughout your styles.',
                                    style: {
                                        lineHeight: '1.6',
                                        '@media (--mobile)': {
                                            fontSize: '14px'
                                        },
                                        
                                        '@media (--dark-mode)': {
                                            color: '#d0d0d0'
                                        }
                                    }
                                },
                                {
                                    tagName: 'ul',
                                    style: {
                                        lineHeight: '1.6',
                                        '@media (--dark-mode)': {
                                            color: '#d0d0d0'
                                        }
                                    },
                                    children: [
                                        {
                                            tagName: 'li',
                                            textContent: 'Define once, use everywhere'
                                        },
                                        {
                                            tagName: 'li',
                                            textContent: 'Supports complex media query combinations'
                                        },
                                        {
                                            tagName: 'li',
                                            textContent: 'Boolean values (true/false) supported'
                                        },
                                        {
                                            tagName: 'li',
                                            textContent: 'Proper logical evaluation, not textual substitution'
                                        },
                                        {
                                            tagName: 'li',
                                            textContent: 'Circular dependency detection'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};