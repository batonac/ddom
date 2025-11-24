# Proxy-Based Visual Page Builder Approach

The Proxy-based approach wraps DDOM elements in editor proxies that intercept property access and updates, providing fine-grained control over editability and automatic change tracking.

## Architecture

### Core Concepts

1. **EditableElement Wrapper** - Proxy that wraps DDOM elements
2. **Change Tracking** - Automatic detection of property modifications
3. **Batch Operations** - Group multiple changes for efficient updates
4. **Metadata Injection** - Add editor-specific data without modifying source objects

### Key Components

```javascript
class EditableElement {
  constructor(sourceElement, builder) {
    this.source = sourceElement;
    this.builder = builder;
    this.metadata = {
      id: sourceElement.id || this.generateId(),
      selected: false,
      editHistory: [],
      batchMode: false,
      pendingChanges: new Map()
    };
    
    return new Proxy(this, this.createProxyHandler());
  }
  
  createProxyHandler() {
    return {
      get: (target, prop) => this.handleGet(target, prop),
      set: (target, prop, value) => this.handleSet(target, prop, value),
      has: (target, prop) => this.handleHas(target, prop),
      ownKeys: (target) => this.handleOwnKeys(target)
    };
  }
}
```

## Implementation Example

### Proxy Handler Implementation

```javascript
handleGet(target, prop) {
  // Editor metadata access
  if (prop.startsWith('_editor')) {
    return target.metadata[prop.slice(7)];
  }
  
  // Editor methods
  if (typeof target[prop] === 'function') {
    return target[prop].bind(target);
  }
  
  // Source property access
  const value = target.source[prop];
  
  // Wrap nested objects in proxies
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return new EditableProperty(value, target, prop);
  }
  
  return value;
}

handleSet(target, prop, value) {
  // Prevent editing of read-only properties
  if (this.isReadOnlyProperty(prop)) {
    console.warn(`Property ${prop} is read-only`);
    return false;
  }
  
  // Track change for undo/redo
  const oldValue = target.source[prop];
  
  if (target.metadata.batchMode) {
    // Store for batch commit
    target.metadata.pendingChanges.set(prop, { oldValue, newValue: value });
  } else {
    // Immediate update
    this.executePropertyChange(target, prop, value, oldValue);
  }
  
  return true;
}
```

### Editable Property for Nested Objects

```javascript
class EditableProperty {
  constructor(sourceObject, parentElement, propertyName) {
    this.source = sourceObject;
    this.parent = parentElement;
    this.propertyName = propertyName;
    
    return new Proxy(this, {
      get: (target, prop) => {
        const value = target.source[prop];
        
        // Wrap further nested objects
        if (value && typeof value === 'object') {
          return new EditableProperty(value, target.parent, `${target.propertyName}.${prop}`);
        }
        
        return value;
      },
      
      set: (target, prop, value) => {
        const oldValue = target.source[prop];
        const propertyPath = `${target.propertyName}.${prop}`;
        
        if (target.parent.metadata.batchMode) {
          target.parent.metadata.pendingChanges.set(propertyPath, { oldValue, newValue: value });
        } else {
          target.parent.builder.updateNestedProperty(target.parent, propertyPath, value, oldValue);
        }
        
        return true;
      }
    });
  }
}
```

### Page Builder Integration

```javascript
class ProxyBasedPageBuilder {
  constructor() {
    this.elements = new Map(); // id -> EditableElement
    this.selectedElement = null;
    this.history = new CommandHistory();
    this.clipboard = null;
  }
  
  createElement(elementSpec) {
    const editableElement = new EditableElement(elementSpec, this);
    this.elements.set(editableElement._editorId, editableElement);
    
    // Setup DOM element with proxy integration
    const domElement = this.createDOMElement(editableElement);
    
    return { editableElement, domElement };
  }
  
  createDOMElement(editableElement) {
    const element = document.createElement(editableElement.tagName);
    element.id = editableElement._editorId;
    
    // Bind properties to DOM
    this.bindPropertyToDOM(element, editableElement, 'textContent');
    this.bindStyleToDOM(element, editableElement.style);
    this.bindAttributesToDOM(element, editableElement.attributes);
    
    // Add selection handling
    element.onclick = (e) => {
      e.stopPropagation();
      this.selectElement(editableElement);
    };
    
    return element;
  }
  
  bindPropertyToDOM(domElement, editableElement, property) {
    // Initial value
    if (editableElement[property] !== undefined) {
      domElement[property] = editableElement[property];
    }
    
    // Watch for changes
    this.watchProperty(editableElement, property, (newValue) => {
      domElement[property] = newValue;
    });
  }
  
  bindStyleToDOM(domElement, styleProxy) {
    // Bind each style property
    Object.keys(styleProxy.source || {}).forEach(styleProp => {
      domElement.style[styleProp] = styleProxy[styleProp];
      
      this.watchProperty(styleProxy, styleProp, (newValue) => {
        domElement.style[styleProp] = newValue;
      });
    });
  }
}
```

## Advanced Features

### Batch Operations

```javascript
// Batch multiple changes for performance
editableElement.startBatch();
editableElement.style.backgroundColor = '#ff0000';
editableElement.style.color = '#ffffff';
editableElement.textContent = 'Updated text';
editableElement.commitBatch(); // Single undo/redo entry, single DOM update
```

### Change Validation

```javascript
class ValidatedEditableElement extends EditableElement {
  handleSet(target, prop, value) {
    // Validate the change
    const validation = this.validatePropertyChange(prop, value);
    if (!validation.valid) {
      this.builder.showValidationError(validation.message);
      return false;
    }
    
    return super.handleSet(target, prop, value);
  }
  
  validatePropertyChange(prop, value) {
    // Type validation
    if (prop === 'tagName' && typeof value !== 'string') {
      return { valid: false, message: 'tagName must be a string' };
    }
    
    // CSS validation
    if (prop.startsWith('style.')) {
      const styleProp = prop.replace('style.', '');
      if (!this.isValidCSSProperty(styleProp, value)) {
        return { valid: false, message: `Invalid CSS value for ${styleProp}` };
      }
    }
    
    return { valid: true };
  }
}
```

### Live Editing with Input Binding

```javascript
class LiveEditableElement extends EditableElement {
  createInlineEditor(property) {
    const input = document.createElement('input');
    input.value = this[property] || '';
    input.className = 'inline-editor';
    
    // Debounced updates
    const debouncedUpdate = debounce((value) => {
      this[property] = value;
    }, 300);
    
    input.oninput = (e) => {
      debouncedUpdate(e.target.value);
    };
    
    input.onblur = () => {
      this.commitInlineEdit(property, input.value);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitInlineEdit(property, input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelInlineEdit(property);
      }
    };
    
    return input;
  }
}
```

### Property Watching System

```javascript
class PropertyWatcher {
  constructor() {
    this.watchers = new Map();
  }
  
  watch(element, property, callback) {
    const key = `${element._editorId}.${property}`;
    
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    
    this.watchers.get(key).push(callback);
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  notify(element, property, newValue, oldValue) {
    const key = `${element._editorId}.${property}`;
    const callbacks = this.watchers.get(key) || [];
    
    callbacks.forEach(callback => {
      try {
        callback(newValue, oldValue, property);
      } catch (error) {
        console.error('Property watcher error:', error);
      }
    });
  }
}
```

## Benefits

1. **Transparent API** - Works with existing DDOM code patterns
2. **Fine-grained Control** - Intercept any property access or modification
3. **Metadata Injection** - Add editor features without modifying source objects
4. **Validation** - Prevent invalid changes at the property level
5. **Batching** - Group changes for performance and undo/redo

## Limitations

1. **Memory Overhead** - Each element wrapped in a proxy
2. **Complexity** - More complex than simple approaches
3. **Debugging** - Proxy behavior can be harder to debug
4. **Performance** - Proxy overhead on every property access

## When to Use

- **Fine-grained Control** needed over what can be edited
- **Complex Validation** requirements for property changes
- **Legacy Code Integration** where you can't modify existing DDOM structures
- **Advanced Editor Features** like live editing, property watching, etc.

## Complete Example

See [`proxy-based-builder.js`](./proxy-based-builder.js) for a complete implementation of this approach.