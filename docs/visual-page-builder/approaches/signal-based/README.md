# Signal-Based Visual Page Builder Approach

The Signal-based approach leverages DDOM's built-in reactivity system to create efficient, automatic updates between the editor state and the rendered output.

## Architecture

### Core Concepts

1. **Reactive Document State** - The entire DDOM structure is wrapped in Signals
2. **Computed Properties** - Derived values update automatically when dependencies change
3. **Component Watchers** - Isolated signal management for editor components
4. **Effect System** - Automatic DOM updates when Signal values change

### Key Components

```javascript
import { Signal, createEffect, ComponentSignalWatcher } from '../../../lib/dist/index.js';

// Editor state management
class SignalBasedPageBuilder {
  constructor() {
    this.watcher = new ComponentSignalWatcher();
    
    // Core reactive state
    this.$document = new Signal.State({
      document: {
        body: {
          style: { margin: '0', padding: '20px' },
          children: []
        }
      }
    });
    
    this.$selectedElementId = new Signal.State(null);
    this.$editMode = new Signal.State('select'); // 'select', 'edit', 'drag'
    
    // Computed properties
    this.$selectedElement = new Signal.Computed(() => {
      const id = this.$selectedElementId.get();
      return id ? this.findElementById(id) : null;
    });
    
    this.$canUndo = new Signal.Computed(() => this.history.length > 0);
    this.$canRedo = new Signal.Computed(() => this.redoStack.length > 0);
    
    this.setupEffects();
  }
  
  setupEffects() {
    // Auto-render canvas when document changes
    createEffect(() => {
      const doc = this.$document.get();
      this.renderCanvas(doc);
    }, this.watcher);
    
    // Update properties panel when selection changes
    createEffect(() => {
      const selected = this.$selectedElement.get();
      this.updatePropertiesPanel(selected);
    }, this.watcher);
    
    // Update element tree when document structure changes
    createEffect(() => {
      const doc = this.$document.get();
      this.updateElementTree(doc);
    }, this.watcher);
  }
}
```

## Implementation Example

### Element Creation with Signals

```javascript
addElement(elementType) {
  const newElement = {
    tagName: elementType.tagName,
    id: 'element-' + Date.now(),
    ...this.getDefaultProperties(elementType),
    
    // Make properties reactive
    $textContent: new Signal.State(this.getDefaultText(elementType)),
    $style: new Signal.State(this.getDefaultStyles(elementType))
  };
  
  // Add to document structure
  const currentDoc = this.$document.get();
  const newChildren = [...currentDoc.document.body.children, newElement];
  
  this.$document.set({
    ...currentDoc,
    document: {
      ...currentDoc.document,
      body: {
        ...currentDoc.document.body,
        children: newChildren
      }
    }
  });
  
  // Auto-select the new element
  this.$selectedElementId.set(newElement.id);
}
```

### Property Updates

```javascript
updateProperty(elementId, propertyPath, value) {
  const element = this.findElementById(elementId);
  if (!element) return;
  
  // Handle reactive properties
  if (propertyPath.startsWith('$')) {
    const signalProp = element[propertyPath];
    if (signalProp && typeof signalProp.set === 'function') {
      signalProp.set(value);
      return;
    }
  }
  
  // Handle nested properties like 'style.backgroundColor'
  if (propertyPath.includes('.')) {
    const [parentProp, childProp] = propertyPath.split('.');
    if (element['$' + parentProp]) {
      const currentValue = element['$' + parentProp].get();
      element['$' + parentProp].set({
        ...currentValue,
        [childProp]: value
      });
    }
  } else {
    // Direct property update
    if (element['$' + propertyPath]) {
      element['$' + propertyPath].set(value);
    }
  }
  
  // Trigger document change for non-reactive fallback
  this.markDocumentChanged();
}
```

### Reactive Element Rendering

```javascript
renderElement(elementSpec) {
  // Create base element
  const element = document.createElement(elementSpec.tagName);
  element.id = elementSpec.id;
  
  // Setup reactive text content
  if (elementSpec.$textContent) {
    createEffect(() => {
      element.textContent = elementSpec.$textContent.get();
    }, this.watcher);
  }
  
  // Setup reactive styles
  if (elementSpec.$style) {
    createEffect(() => {
      const styles = elementSpec.$style.get();
      Object.assign(element.style, styles);
    }, this.watcher);
  }
  
  // Setup reactive attributes
  if (elementSpec.$attributes) {
    createEffect(() => {
      const attrs = elementSpec.$attributes.get();
      Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }, this.watcher);
  }
  
  // Add editor interaction handlers
  this.setupElementEditing(element, elementSpec);
  
  return element;
}
```

## Advanced Features

### Undo/Redo with Signals

```javascript
class CommandHistory {
  constructor(pageBuilder) {
    this.builder = pageBuilder;
    this.history = [];
    this.redoStack = [];
    this.currentCommand = null;
  }
  
  execute(command) {
    command.execute();
    this.history.push(command);
    this.redoStack = []; // Clear redo stack
    
    // Update computed signals
    this.builder.$canUndo.set(this.history.length > 0);
    this.builder.$canRedo.set(false);
  }
  
  undo() {
    if (this.history.length === 0) return;
    
    const command = this.history.pop();
    command.undo();
    this.redoStack.push(command);
    
    this.builder.$canUndo.set(this.history.length > 0);
    this.builder.$canRedo.set(this.redoStack.length > 0);
  }
}

// Command pattern for property updates
class UpdatePropertyCommand {
  constructor(elementId, propertyPath, newValue, oldValue) {
    this.elementId = elementId;
    this.propertyPath = propertyPath;
    this.newValue = newValue;
    this.oldValue = oldValue;
  }
  
  execute() {
    this.builder.updateProperty(this.elementId, this.propertyPath, this.newValue);
  }
  
  undo() {
    this.builder.updateProperty(this.elementId, this.propertyPath, this.oldValue);
  }
}
```

### Batch Updates

```javascript
class BatchUpdater {
  constructor(pageBuilder) {
    this.builder = pageBuilder;
    this.batches = new Map();
  }
  
  startBatch(elementId) {
    if (!this.batches.has(elementId)) {
      this.batches.set(elementId, {
        element: this.builder.findElementById(elementId),
        updates: [],
        originalValues: new Map()
      });
    }
  }
  
  addUpdate(elementId, propertyPath, value) {
    const batch = this.batches.get(elementId);
    if (!batch) return;
    
    // Store original value for undo
    if (!batch.originalValues.has(propertyPath)) {
      const currentValue = this.getCurrentValue(batch.element, propertyPath);
      batch.originalValues.set(propertyPath, currentValue);
    }
    
    batch.updates.push({ propertyPath, value });
  }
  
  commitBatch(elementId) {
    const batch = this.batches.get(elementId);
    if (!batch) return;
    
    // Create compound command for undo/redo
    const command = new CompoundCommand(
      batch.updates.map(update => 
        new UpdatePropertyCommand(
          elementId,
          update.propertyPath,
          update.value,
          batch.originalValues.get(update.propertyPath)
        )
      )
    );
    
    this.builder.history.execute(command);
    this.batches.delete(elementId);
  }
}
```

## Performance Optimizations

### Debounced Updates

```javascript
const debouncedUpdate = debounce((elementId, propertyPath, value) => {
  this.updateProperty(elementId, propertyPath, value);
}, 100);

// Use in input handlers
input.oninput = (e) => {
  debouncedUpdate(this.selectedElementId, 'textContent', e.target.value);
};
```

### Selective Re-rendering

```javascript
// Only re-render changed elements
createEffect(() => {
  const doc = this.$document.get();
  const changedElements = this.detectChangedElements(doc);
  
  changedElements.forEach(elementId => {
    this.renderSingleElement(elementId);
  });
}, this.watcher);
```

## Benefits

1. **Automatic Updates** - Changes propagate automatically through the reactive system
2. **Performance** - Only changed elements are updated
3. **Consistency** - Single source of truth maintained through Signals
4. **Memory Management** - Component watchers handle cleanup automatically
5. **Developer Experience** - Familiar reactive programming patterns

## Complete Example

See [`signal-based-builder.js`](./signal-based-builder.js) for a complete implementation of this approach.