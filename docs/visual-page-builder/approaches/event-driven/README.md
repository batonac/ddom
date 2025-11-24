# Event-Driven Re-render Visual Page Builder Approach

The Event-driven re-render approach updates the entire DDOM structure and re-renders affected portions of the DOM when changes occur. This is the simplest approach and matches the current implementation in the examples.

## Architecture

### Core Concepts

1. **Single Source of Truth** - One DDOM object contains all state
2. **Event-based Updates** - Changes trigger events that cause re-renders
3. **Full Re-creation** - Elements are re-created on each render
4. **Simple State Management** - No complex tracking or proxies needed

### Key Components

```javascript
class EventDrivenPageBuilder {
  constructor() {
    this.currentStructure = {
      document: {
        body: {
          style: { margin: '0', padding: '20px' },
          children: []
        }
      }
    };
    
    this.selectedElement = null;
    this.selectedPath = null;
    this.history = [];
    this.redoStack = [];
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for document changes
    document.addEventListener('ddom-element-added', () => this.handleDocumentChange());
    document.addEventListener('ddom-element-removed', () => this.handleDocumentChange());
    document.addEventListener('ddom-property-changed', () => this.handleDocumentChange());
  }
  
  handleDocumentChange() {
    this.renderCanvas();
    this.updateElementTree();
    this.updatePropertiesPanel();
  }
}
```

## Implementation Example

### Adding Elements

```javascript
addElement(elementType) {
  // Create new element with default properties
  const newElement = {
    tagName: elementType.tagName,
    id: 'element-' + Date.now(),
    textContent: this.getDefaultText(elementType),
    style: this.getDefaultStyle(elementType),
    onclick: this.selectElementHandler.bind(this)
  };
  
  // Add to structure
  this.currentStructure.document.body.children.push(newElement);
  
  // Store for undo
  this.addToHistory({
    type: 'add-element',
    element: newElement,
    undo: () => this.removeElement(newElement.id)
  });
  
  // Trigger re-render
  this.renderCanvas();
  this.updateElementTree();
  
  // Select the new element
  this.selectElement(newElement.id);
  
  // Dispatch event
  this.dispatchEvent('ddom-element-added', { element: newElement });
}
```

### Property Updates

```javascript
updateProperty(property, value) {
  if (!this.selectedElement) return;
  
  // Store old value for undo
  const oldValue = this.getPropertyValue(this.selectedElement, property);
  
  // Update the property
  this.setPropertyValue(this.selectedElement, property, value);
  
  // Add to history
  this.addToHistory({
    type: 'update-property',
    elementId: this.selectedElement.id,
    property: property,
    oldValue: oldValue,
    newValue: value,
    undo: () => this.setPropertyValue(this.selectedElement, property, oldValue)
  });
  
  // Trigger re-render
  this.renderCanvas();
  
  // Dispatch event
  this.dispatchEvent('ddom-property-changed', {
    elementId: this.selectedElement.id,
    property: property,
    value: value
  });
}

setPropertyValue(element, property, value) {
  if (property.startsWith('style.')) {
    const styleProp = property.replace('style.', '');
    if (!element.style) element.style = {};
    element.style[styleProp] = value;
  } else if (property.startsWith('attributes.')) {
    const attrProp = property.replace('attributes.', '');
    if (!element.attributes) element.attributes = {};
    element.attributes[attrProp] = value;
  } else {
    element[property] = value;
  }
}

getPropertyValue(element, property) {
  if (property.startsWith('style.')) {
    const styleProp = property.replace('style.', '');
    return element.style?.[styleProp];
  } else if (property.startsWith('attributes.')) {
    const attrProp = property.replace('attributes.', '');
    return element.attributes?.[attrProp];
  } else {
    return element[property];
  }
}
```

### Canvas Rendering

```javascript
renderCanvas() {
  const canvas = document.getElementById('canvas-area');
  if (!canvas) return;
  
  // Clear existing content
  canvas.innerHTML = '';
  
  // Show empty state if no elements
  if (this.currentStructure.document.body.children.length === 0) {
    this.showEmptyCanvas(canvas);
    return;
  }
  
  // Render each element
  this.currentStructure.document.body.children.forEach((child, index) => {
    const domElement = this.createElement(child, index);
    if (domElement) {
      this.setupElementInteractions(domElement, child, index);
      canvas.appendChild(domElement);
    }
  });
  
  // Update selection highlights
  this.updateSelectionHighlight();
}

createElement(elementSpec, index) {
  // Use DDOM's createElement with editor enhancements
  const element = DDOM.createElement(elementSpec);
  
  // Add editor-specific attributes
  element.dataset.editorIndex = index;
  element.dataset.editorId = elementSpec.id;
  
  // Add selection highlighting
  if (this.selectedElement && this.selectedElement.id === elementSpec.id) {
    element.classList.add('selected');
  }
  
  return element;
}

setupElementInteractions(domElement, elementSpec, index) {
  // Click to select
  domElement.onclick = (e) => {
    e.stopPropagation();
    this.selectElement(elementSpec.id);
  };
  
  // Double-click for inline editing
  domElement.ondblclick = (e) => {
    e.stopPropagation();
    this.startInlineEdit(domElement, elementSpec);
  };
  
  // Drag and drop
  this.setupDragAndDrop(domElement, elementSpec, index);
}
```

### Element Tree Updates

```javascript
updateElementTree() {
  const tree = document.getElementById('element-tree');
  if (!tree) return;
  
  tree.innerHTML = '';
  
  this.createElementTree(
    this.currentStructure.document.body.children, 
    tree, 
    0
  );
}

createElementTree(elements, container, depth) {
  elements.forEach((element, index) => {
    const treeItem = this.createTreeItem(element, depth, index);
    container.appendChild(treeItem);
    
    // Recursively add children
    if (element.children && element.children.length > 0) {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-children';
      childContainer.style.marginLeft = '20px';
      
      this.createElementTree(element.children, childContainer, depth + 1);
      container.appendChild(childContainer);
    }
  });
}

createTreeItem(element, depth, index) {
  const item = document.createElement('div');
  item.className = 'tree-item';
  item.dataset.elementId = element.id;
  
  // Add selection state
  if (this.selectedElement && this.selectedElement.id === element.id) {
    item.classList.add('selected');
  }
  
  // Create label
  const label = document.createElement('span');
  label.textContent = `${element.tagName}${element.id ? ' #' + element.id : ''}`;
  
  // Click to select
  item.onclick = (e) => {
    e.stopPropagation();
    this.selectElement(element.id);
  };
  
  item.appendChild(label);
  return item;
}
```

## Event System

### Custom Events

```javascript
dispatchEvent(eventType, detail) {
  const event = new CustomEvent(eventType, {
    detail: detail,
    bubbles: true,
    cancelable: true
  });
  
  document.dispatchEvent(event);
}

// Usage examples
this.dispatchEvent('ddom-element-selected', { elementId: 'element-123' });
this.dispatchEvent('ddom-structure-changed', { structure: this.currentStructure });
this.dispatchEvent('ddom-property-updated', { 
  elementId: 'element-123', 
  property: 'textContent', 
  value: 'New text' 
});
```

### Event Listeners for Extensions

```javascript
// External components can listen for builder events
document.addEventListener('ddom-element-selected', (e) => {
  console.log('Element selected:', e.detail.elementId);
  updateCustomPropertyEditor(e.detail.elementId);
});

document.addEventListener('ddom-structure-changed', (e) => {
  console.log('Structure changed');
  saveToLocalStorage(e.detail.structure);
});

document.addEventListener('ddom-property-updated', (e) => {
  console.log('Property updated:', e.detail);
  markDocumentAsModified();
});
```

## Undo/Redo System

```javascript
class HistoryManager {
  constructor(builder) {
    this.builder = builder;
    this.history = [];
    this.redoStack = [];
    this.maxHistorySize = 100;
  }
  
  addToHistory(action) {
    // Remove excess history
    if (this.history.length >= this.maxHistorySize) {
      this.history.shift();
    }
    
    this.history.push(action);
    this.redoStack = []; // Clear redo stack
    
    this.builder.dispatchEvent('ddom-history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
  
  undo() {
    if (!this.canUndo()) return;
    
    const action = this.history.pop();
    action.undo();
    this.redoStack.push(action);
    
    // Trigger re-render
    this.builder.renderCanvas();
    this.builder.updateElementTree();
    
    this.builder.dispatchEvent('ddom-history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
  
  redo() {
    if (!this.canRedo()) return;
    
    const action = this.redoStack.pop();
    action.execute();
    this.history.push(action);
    
    // Trigger re-render
    this.builder.renderCanvas();
    this.builder.updateElementTree();
    
    this.builder.dispatchEvent('ddom-history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
  
  canUndo() {
    return this.history.length > 0;
  }
  
  canRedo() {
    return this.redoStack.length > 0;
  }
}
```

## Benefits

1. **Simplicity** - Easy to understand and implement
2. **Reliability** - No state synchronization issues
3. **Debugging** - Clear cause and effect relationships
4. **Extensibility** - Easy to add new features via events
5. **Compatibility** - Works with any DDOM structure

## Limitations

1. **Performance** - Re-renders entire structure on every change
2. **User Experience** - May cause flicker or lose focus
3. **Memory** - Creates new DOM elements frequently
4. **Scalability** - Becomes slow with large documents

## Optimizations

### Partial Re-rendering

```javascript
renderChangedElements(changedElementIds) {
  const canvas = document.getElementById('canvas-area');
  
  changedElementIds.forEach(elementId => {
    const existingElement = canvas.querySelector(`[data-editor-id="${elementId}"]`);
    const elementSpec = this.findElementById(elementId);
    
    if (existingElement && elementSpec) {
      const newElement = this.createElement(elementSpec);
      existingElement.parentNode.replaceChild(newElement, existingElement);
    }
  });
}
```

### Debounced Updates

```javascript
const debouncedRender = debounce(() => {
  this.renderCanvas();
}, 100);

updateProperty(property, value) {
  // Update property immediately
  this.setPropertyValue(this.selectedElement, property, value);
  
  // Debounce the render
  debouncedRender();
}
```

## When to Use

- **Simple Projects** with small to medium-sized documents
- **Prototyping** when you need something working quickly
- **Learning** as it's the easiest approach to understand
- **Legacy Integration** when you need maximum compatibility

## Complete Example

See [`event-driven-builder.js`](./event-driven-builder.js) for a complete implementation of this approach.