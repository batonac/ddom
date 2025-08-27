// Signal-Based Visual Page Builder Implementation
// This demonstrates the recommended approach using DDOM's Signal system

import { Signal, createEffect, ComponentSignalWatcher } from '../../../../lib/dist/index.js';

/**
 * A complete signal-based page builder that demonstrates reactive updates,
 * efficient DOM manipulation, and clean state management.
 */
export class SignalBasedPageBuilder {
  constructor() {
    this.watcher = new ComponentSignalWatcher();
    this.history = [];
    this.redoStack = [];
    
    this.initializeState();
    this.setupEffects();
  }
  
  initializeState() {
    // Core reactive state
    this.$document = new Signal.State({
      document: {
        body: {
          style: {
            margin: '0',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#f5f5f5'
          },
          children: []
        }
      }
    });
    
    this.$selectedElementId = new Signal.State(null);
    this.$editMode = new Signal.State('select');
    this.$dragState = new Signal.State(null);
    
    // Computed properties
    this.$selectedElement = new Signal.Computed(() => {
      const id = this.$selectedElementId.get();
      return id ? this.findElementById(id) : null;
    });
    
    this.$canUndo = new Signal.Computed(() => this.history.length > 0);
    this.$canRedo = new Signal.Computed(() => this.redoStack.length > 0);
    
    this.$documentJson = new Signal.Computed(() => {
      return JSON.stringify(this.$document.get(), null, 2);
    });
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
    
    // Update toolbar state
    createEffect(() => {
      const canUndo = this.$canUndo.get();
      const canRedo = this.$canRedo.get();
      this.updateToolbarState(canUndo, canRedo);
    }, this.watcher);
  }
  
  // Element Management
  addElement(elementType) {
    const newElement = this.createReactiveElement(elementType);
    
    const currentDoc = this.$document.get();
    const newChildren = [...currentDoc.document.body.children, newElement];
    
    this.updateDocument({
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
    
    return newElement;
  }
  
  createReactiveElement(elementType) {
    const defaults = this.getElementDefaults(elementType.tagName);
    
    return {
      tagName: elementType.tagName,
      id: 'element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      
      // Reactive properties
      $textContent: new Signal.State(defaults.textContent || ''),
      $style: new Signal.State(defaults.style || {}),
      $attributes: new Signal.State(defaults.attributes || {}),
      
      // Non-reactive metadata
      _editorMeta: {
        created: Date.now(),
        type: elementType.name
      }
    };
  }
  
  updateProperty(elementId, propertyPath, value) {
    const element = this.findElementById(elementId);
    if (!element) return;
    
    const oldValue = this.getPropertyValue(element, propertyPath);
    
    // Execute update
    this.setPropertyValue(element, propertyPath, value);
    
    // Add to history
    this.addToHistory(new UpdatePropertyCommand(this, elementId, propertyPath, value, oldValue));
  }
  
  setPropertyValue(element, propertyPath, value) {
    if (propertyPath.startsWith('$')) {
      // Direct signal property
      const signal = element[propertyPath];
      if (signal && typeof signal.set === 'function') {
        signal.set(value);
      }
    } else if (propertyPath.includes('.')) {
      // Nested property like 'style.backgroundColor'
      const [parentProp, ...childPath] = propertyPath.split('.');
      const signalProp = element['$' + parentProp];
      
      if (signalProp) {
        const currentValue = signalProp.get();
        const newValue = this.setNestedValue(currentValue, childPath, value);
        signalProp.set(newValue);
      }
    } else {
      // Legacy property handling
      const signalProp = element['$' + propertyPath];
      if (signalProp) {
        signalProp.set(value);
      } else {
        element[propertyPath] = value;
      }
    }
  }
  
  getPropertyValue(element, propertyPath) {
    if (propertyPath.startsWith('$')) {
      const signal = element[propertyPath];
      return signal && typeof signal.get === 'function' ? signal.get() : undefined;
    } else if (propertyPath.includes('.')) {
      const [parentProp, ...childPath] = propertyPath.split('.');
      const signalProp = element['$' + parentProp];
      if (signalProp) {
        const value = signalProp.get();
        return this.getNestedValue(value, childPath);
      }
    } else {
      const signalProp = element['$' + propertyPath];
      if (signalProp) {
        return signalProp.get();
      }
      return element[propertyPath];
    }
  }
  
  // Rendering
  renderCanvas(doc) {
    const canvas = document.getElementById('canvas-area');
    if (!canvas) return;
    
    // Clear previous content
    canvas.innerHTML = '';
    
    if (doc.document.body.children.length === 0) {
      canvas.innerHTML = '<div class="empty-canvas">Drop elements here to start building</div>';
      return;
    }
    
    // Render each child element
    doc.document.body.children.forEach(child => {
      const element = this.renderReactiveElement(child);
      canvas.appendChild(element);
    });
  }
  
  renderReactiveElement(elementSpec) {
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
    
    // Add selection handling
    element.onclick = (e) => {
      e.stopPropagation();
      this.$selectedElementId.set(elementSpec.id);
    };
    
    // Add visual selection indicator
    createEffect(() => {
      const selectedId = this.$selectedElementId.get();
      if (selectedId === elementSpec.id) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    }, this.watcher);
    
    return element;
  }
  
  // Properties Panel
  updatePropertiesPanel(selectedElement) {
    const panel = document.getElementById('properties-content');
    if (!panel) return;
    
    panel.innerHTML = '';
    
    if (!selectedElement) {
      panel.innerHTML = '<div class="no-selection">Select an element to edit properties</div>';
      return;
    }
    
    // Create property editors based on element type
    const editors = this.createPropertyEditors(selectedElement);
    editors.forEach(editor => panel.appendChild(editor));
  }
  
  createPropertyEditors(element) {
    const editors = [];
    
    // Text content editor
    if (element.$textContent) {
      editors.push(this.createTextEditor('Text Content', element.$textContent));
    }
    
    // Style editors
    if (element.$style) {
      const styleValue = element.$style.get();
      Object.keys(styleValue).forEach(styleProp => {
        editors.push(this.createStyleEditor(styleProp, element.id, styleValue[styleProp]));
      });
    }
    
    return editors;
  }
  
  createTextEditor(label, signal) {
    const container = document.createElement('div');
    container.className = 'property-editor';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = signal.get();
    
    input.oninput = () => {
      signal.set(input.value);
    };
    
    container.appendChild(labelEl);
    container.appendChild(input);
    
    return container;
  }
  
  // Utility Methods
  findElementById(id, elements = null) {
    if (!elements) {
      const doc = this.$document.get();
      elements = doc.document.body.children;
    }
    
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      if (element.children) {
        const found = this.findElementById(id, element.children);
        if (found) return found;
      }
    }
    return null;
  }
  
  updateDocument(newDoc) {
    this.$document.set(newDoc);
  }
  
  setNestedValue(obj, path, value) {
    const result = { ...obj };
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      current[key] = { ...current[key] };
      current = current[key];
    }
    
    current[path[path.length - 1]] = value;
    return result;
  }
  
  getNestedValue(obj, path) {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }
  
  getElementDefaults(tagName) {
    const defaults = {
      h1: { 
        textContent: 'Heading 1', 
        style: { color: '#333', fontSize: '2em', margin: '0.5em 0' } 
      },
      h2: { 
        textContent: 'Heading 2', 
        style: { color: '#555', fontSize: '1.5em', margin: '0.5em 0' } 
      },
      p: { 
        textContent: 'This is a paragraph.', 
        style: { margin: '1em 0', lineHeight: '1.5' } 
      },
      button: { 
        textContent: 'Click Me', 
        style: { 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: 'pointer' 
        } 
      }
    };
    
    return defaults[tagName] || { textContent: `New ${tagName}`, style: {} };
  }
  
  // Command Pattern for Undo/Redo
  addToHistory(command) {
    this.history.push(command);
    this.redoStack = [];
  }
  
  undo() {
    if (this.history.length === 0) return;
    
    const command = this.history.pop();
    command.undo();
    this.redoStack.push(command);
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    
    const command = this.redoStack.pop();
    command.execute();
    this.history.push(command);
  }
  
  // Cleanup
  dispose() {
    this.watcher.dispose();
  }
}

// Command classes for undo/redo
class UpdatePropertyCommand {
  constructor(builder, elementId, propertyPath, newValue, oldValue) {
    this.builder = builder;
    this.elementId = elementId;
    this.propertyPath = propertyPath;
    this.newValue = newValue;
    this.oldValue = oldValue;
  }
  
  execute() {
    const element = this.builder.findElementById(this.elementId);
    if (element) {
      this.builder.setPropertyValue(element, this.propertyPath, this.newValue);
    }
  }
  
  undo() {
    const element = this.builder.findElementById(this.elementId);
    if (element) {
      this.builder.setPropertyValue(element, this.propertyPath, this.oldValue);
    }
  }
}

export default SignalBasedPageBuilder;