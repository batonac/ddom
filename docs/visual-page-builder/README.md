# Visual Page Builder Conventions for DDOM

This document establishes the modern, concise, elegant, performant, and reliable paradigms for visual page builder parsing and updates to DDOM object literal code.

## Overview

Visual page builders require efficient mechanisms to:
1. Track element selection and editing state
2. Update DDOM object structures when properties change
3. Reflect changes in the live DOM efficiently
4. Maintain data consistency between editor and rendered output
5. Provide undo/redo capabilities
6. Handle complex nested structures and array operations

## Recommended Approaches

### 1. Signal-Based Reactive Approach (Recommended)

Leverages DDOM's built-in Signal system for automatic reactivity and efficient updates.

**Pros:**
- Leverages existing DDOM reactivity infrastructure
- Automatic dependency tracking and updates
- Efficient - only updates what actually changed
- Clean separation between data and presentation
- Built-in memory management through component watchers

**Cons:**
- Requires understanding of Signal concepts
- May have learning curve for developers unfamiliar with reactive programming

**Best for:** Most visual page builder implementations, especially complex ones with deep nesting.

### 2. Proxy-Based Editing Approach 

Wraps DDOM elements in editor proxies that intercept property access and updates.

**Pros:**
- Transparent - works with existing DDOM code
- Can provide additional editor-specific metadata
- Fine-grained control over what can be edited
- Easy to implement undo/redo

**Cons:**
- Requires wrapping every editable element
- Can become complex with nested structures
- Memory overhead from proxy objects

**Best for:** Simple builders or when you need fine-grained control over editability.

### 3. Event-Driven Re-render Approach

Updates the entire structure and re-renders affected portions of the DOM.

**Pros:**
- Simple to implement and understand
- Reliable - no state synchronization issues
- Works with any DDOM structure

**Cons:**
- Performance overhead from re-rendering
- Can cause flicker or loss of focus
- Expensive for large documents

**Best for:** Simple prototypes or builders with small documents.

### 4. AST-Based Approach

Converts DDOM objects to Abstract Syntax Trees for manipulation.

**Pros:**
- Provides advanced code manipulation capabilities
- Can generate actual JavaScript code
- Excellent for code editors and advanced tools

**Cons:**
- Complex implementation
- Requires parser/compiler infrastructure
- Overkill for most visual builders

**Best for:** Advanced developer tools and code generators.

## Architecture Patterns

### Element Addressing

All approaches require a way to uniquely identify and address elements within the DDOM structure:

```javascript
// Path-based addressing
const elementPath = ['document', 'body', 'children', 0, 'children', 2];

// ID-based addressing (recommended)
const elementId = 'element-12345';

// Compound addressing for complex selections
const selection = {
  elementId: 'element-12345',
  propertyPath: ['style', 'backgroundColor']
};
```

### Update Patterns

```javascript
// Immediate update pattern (Signal-based)
window.$selectedElement.style.backgroundColor.set('#ff0000');

// Batched update pattern (Proxy-based)
editableElement.startBatch();
editableElement.style.backgroundColor = '#ff0000';
editableElement.style.color = '#ffffff';
editableElement.commitBatch();

// Command pattern (for undo/redo)
executeCommand(new UpdatePropertyCommand(elementId, 'style.backgroundColor', '#ff0000'));
```

### State Management

```javascript
// Builder state structure
const builderState = {
  document: Signal.State(ddomStructure),
  selection: Signal.State(null),
  editMode: Signal.State('select'), // 'select', 'edit', 'drag'
  history: CommandHistory(),
  clipboard: Signal.State(null)
};
```

## Implementation Examples

See the `approaches/` directory for detailed examples of each pattern:

- [`signal-based/`](./approaches/signal-based/) - Complete Signal-based implementation
- [`proxy-based/`](./approaches/proxy-based/) - Proxy wrapper approach
- [`event-driven/`](./approaches/event-driven/) - Simple re-render approach
- [`ast-based/`](./approaches/ast-based/) - AST manipulation approach

## Best Practices

### Performance

1. **Use Signals for reactive properties** - Leverages DDOM's efficient update system
2. **Batch DOM updates** - Group multiple changes together
3. **Minimize re-renders** - Only update what actually changed
4. **Use weak references** - Prevent memory leaks from editor metadata

### Developer Experience

1. **Maintain data consistency** - Single source of truth for element state
2. **Provide clear APIs** - Hide complexity behind simple interfaces
3. **Enable debugging** - Expose selection and update events
4. **Support undo/redo** - Essential for user experience

### Reliability

1. **Handle edge cases** - Null values, missing properties, circular references
2. **Validate inputs** - Ensure property values are valid
3. **Graceful degradation** - Fall back to simpler approaches when needed
4. **Error boundaries** - Isolate editor failures from document rendering

## Migration Guide

For existing builders using simple re-render approaches:

1. Start by wrapping your document in a Signal
2. Convert individual property updates to Signal operations
3. Replace manual DOM updates with reactive templates
4. Add editor-specific metadata as computed properties
5. Implement command pattern for undo/redo

## Framework Integration

This convention is designed to work with:

- **DDOM Core** - Uses existing Signal and createElement infrastructure
- **Custom Elements** - Editor components can be DDOM custom elements
- **Web Components** - Compatible with standard web component patterns
- **Build Tools** - Can be bundled and optimized like any DDOM application

## Related Documentation

- [DDOM Signals Documentation](../core/signals.md)
- [DDOM Custom Elements](../custom-elements/README.md)
- [DDOM Array Namespaces](../arrays/README.md)
- [Performance Optimization](../performance/README.md)