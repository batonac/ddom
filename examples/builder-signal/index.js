// Enhanced Signal-Based Page Builder Implementation
// Demonstrates the recommended approach using DDOM's Signal system

export default {
  // Core reactive state using Signals
  $document: null,
  $selectedElementId: null,
  $selectedElement: null,
  $editMode: null,
  $canUndo: null,
  $canRedo: null,
  
  // Non-reactive state
  watcher: null,
  history: [],
  redoStack: [],
  elementTypes: [
    { name: 'Heading 1', tagName: 'h1', icon: 'H1' },
    { name: 'Heading 2', tagName: 'h2', icon: 'H2' },
    { name: 'Paragraph', tagName: 'p', icon: 'P' },
    { name: 'Button', tagName: 'button', icon: 'BTN' },
    { name: 'Div Container', tagName: 'div', icon: 'DIV' },
    { name: 'Section', tagName: 'section', icon: 'SEC' },
    { name: 'Input', tagName: 'input', icon: 'IN' },
    { name: 'Image', tagName: 'img', icon: 'IMG' },
    { name: 'Link', tagName: 'a', icon: 'A' }
  ],
  
  // DDOM structure for the builder UI
  document: {
    body: {
      className: 'builder-container',
      children: [
        // Element Palette
        {
          tagName: 'div',
          className: 'palette',
          children: [
            {
              tagName: 'h3',
              textContent: 'Elements'
            },
            {
              tagName: 'div',
              id: 'element-palette',
              children: [] // Will be populated in oncreateElement
            }
          ]
        },
        
        // Main Area
        {
          tagName: 'div',
          className: 'main-area',
          children: [
            // Toolbar
            {
              tagName: 'div',
              className: 'toolbar',
              children: [
                {
                  tagName: 'button',
                  id: 'undo-btn',
                  textContent: 'Undo',
                  disabled: true,
                  onclick: function() { window.builderApp.undo(); }
                },
                {
                  tagName: 'button',
                  id: 'redo-btn', 
                  textContent: 'Redo',
                  disabled: true,
                  onclick: function() { window.builderApp.redo(); }
                },
                {
                  tagName: 'button',
                  textContent: 'Export',
                  onclick: function() { window.builderApp.exportStructure(); }
                }
              ]
            },
            
            // Canvas Container
            {
              tagName: 'div',
              className: 'canvas-container',
              children: [
                {
                  tagName: 'div',
                  id: 'canvas',
                  className: 'canvas',
                  children: [
                    {
                      tagName: 'div',
                      className: 'empty-canvas',
                      textContent: 'Drop elements here or click elements in the palette to start building'
                    }
                  ]
                }
              ]
            }
          ]
        },
        
        // Properties Panel
        {
          tagName: 'div',
          className: 'properties',
          children: [
            {
              tagName: 'h3',
              textContent: 'Properties'
            },
            {
              tagName: 'div',
              id: 'properties-content',
              children: [
                {
                  tagName: 'div',
                  className: 'no-selection',
                  textContent: 'Select an element to edit properties'
                }
              ]
            }
          ]
        }
      ]
    }
  },
  
  oncreateElement: function() {
    // Initialize reactive state
    this.initializeSignals();
    
    // Setup effects for automatic updates
    this.setupEffects();
    
    // Populate element palette
    this.createElementPalette();
    
    // Make available globally for event handlers
    window.builderApp = this;
    
    console.log('Enhanced Signal-Based Builder initialized');
  },
  
  initializeSignals: function() {
    // Import Signal from DDOM
    const { Signal, ComponentSignalWatcher } = window.DDOM;
    
    // Create component watcher for isolation
    this.watcher = new ComponentSignalWatcher();
    
    // Initialize reactive document state
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
    
    // Selection state
    this.$selectedElementId = new Signal.State(null);
    this.$editMode = new Signal.State('select');
    
    // Computed properties
    this.$selectedElement = new Signal.Computed(() => {
      const id = this.$selectedElementId.get();
      return id ? this.findElementById(id) : null;
    });
    
    this.$canUndo = new Signal.Computed(() => this.history.length > 0);
    this.$canRedo = new Signal.Computed(() => this.redoStack.length > 0);
  },
  
  setupEffects: function() {
    const { createEffect } = window.DDOM;
    
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
    
    // Update toolbar state
    createEffect(() => {
      const canUndo = this.$canUndo.get();
      const canRedo = this.$canRedo.get();
      this.updateToolbarState(canUndo, canRedo);
    }, this.watcher);
  },
  
  createElementPalette: function() {
    const palette = document.getElementById('element-palette');
    if (!palette) return;
    
    this.elementTypes.forEach(elementType => {
      const button = DDOM.createElement({
        tagName: 'button',
        className: 'element-button',
        textContent: elementType.name,
        onclick: () => this.addElement(elementType)
      });
      
      palette.appendChild(button);
    });
  },
  
  addElement: function(elementType) {
    const newElement = this.createReactiveElement(elementType);
    
    const currentDoc = this.$document.get();
    const newChildren = [...currentDoc.document.body.children, newElement];
    
    const newDoc = {
      ...currentDoc,
      document: {
        ...currentDoc.document,
        body: {
          ...currentDoc.document.body,
          children: newChildren
        }
      }
    };
    
    // Update document state
    this.$document.set(newDoc);
    
    // Auto-select the new element
    this.$selectedElementId.set(newElement.id);
    
    // Add to history
    this.addToHistory({
      type: 'add-element',
      element: newElement,
      undo: () => this.removeElementById(newElement.id)
    });
    
    console.log('Added element:', elementType.name);
  },
  
  createReactiveElement: function(elementType) {
    const { Signal } = window.DDOM;
    const defaults = this.getElementDefaults(elementType.tagName);
    
    return {
      tagName: elementType.tagName,
      id: 'element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      
      // Reactive properties using Signals
      $textContent: new Signal.State(defaults.textContent || ''),
      $style: new Signal.State(defaults.style || {}),
      $attributes: new Signal.State(defaults.attributes || {}),
      
      // Editor metadata
      _editorMeta: {
        created: Date.now(),
        type: elementType.name
      }
    };
  },
  
  renderCanvas: function(doc) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    // Clear previous content
    canvas.innerHTML = '';
    
    if (doc.document.body.children.length === 0) {
      canvas.innerHTML = '<div class="empty-canvas">Drop elements here or click elements in the palette to start building</div>';
      return;
    }
    
    // Render each child element
    doc.document.body.children.forEach(child => {
      const element = this.renderReactiveElement(child);
      canvas.appendChild(element);
    });
  },
  
  renderReactiveElement: function(elementSpec) {
    const { createEffect } = window.DDOM;
    
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
  },
  
  updatePropertiesPanel: function(selectedElement) {
    const panel = document.getElementById('properties-content');
    if (!panel) return;
    
    panel.innerHTML = '';
    
    if (!selectedElement) {
      panel.innerHTML = '<div class="no-selection">Select an element to edit properties</div>';
      return;
    }
    
    // Create property editors
    this.createPropertyEditors(selectedElement, panel);
  },
  
  createPropertyEditors: function(element, container) {
    // Text content editor
    if (element.$textContent) {
      this.createTextContentEditor(element, container);
    }
    
    // Style editors
    if (element.$style) {
      this.createStyleEditors(element, container);
    }
    
    // Attribute editors
    if (element.$attributes) {
      this.createAttributeEditors(element, container);
    }
  },
  
  createTextContentEditor: function(element, container) {
    const group = document.createElement('div');
    group.className = 'property-group';
    
    const header = document.createElement('h4');
    header.textContent = 'Content';
    group.appendChild(header);
    
    const field = document.createElement('div');
    field.className = 'property-field';
    
    const label = document.createElement('label');
    label.textContent = 'Text Content:';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.$textContent.get();
    
    // Debounced update
    let timeout;
    input.oninput = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        element.$textContent.set(input.value);
      }, 300);
    };
    
    field.appendChild(label);
    field.appendChild(input);
    group.appendChild(field);
    container.appendChild(group);
  },
  
  createStyleEditors: function(element, container) {
    const group = document.createElement('div');
    group.className = 'property-group';
    
    const header = document.createElement('h4');
    header.textContent = 'Styles';
    group.appendChild(header);
    
    // Common style properties
    const styleProps = [
      { name: 'color', label: 'Text Color', type: 'color' },
      { name: 'backgroundColor', label: 'Background Color', type: 'color' },
      { name: 'fontSize', label: 'Font Size', type: 'text', placeholder: 'e.g., 16px, 1.2em' },
      { name: 'padding', label: 'Padding', type: 'text', placeholder: 'e.g., 10px, 5px 10px' },
      { name: 'margin', label: 'Margin', type: 'text', placeholder: 'e.g., 10px, 5px 10px' }
    ];
    
    const currentStyle = element.$style.get();
    
    styleProps.forEach(prop => {
      const field = document.createElement('div');
      field.className = 'property-field';
      
      const label = document.createElement('label');
      label.textContent = prop.label + ':';
      
      const input = document.createElement('input');
      input.type = prop.type;
      input.value = currentStyle[prop.name] || (prop.type === 'color' ? '#000000' : '');
      if (prop.placeholder) input.placeholder = prop.placeholder;
      
      let timeout;
      input.oninput = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const newStyle = { ...element.$style.get() };
          newStyle[prop.name] = input.value;
          element.$style.set(newStyle);
        }, 300);
      };
      
      field.appendChild(label);
      field.appendChild(input);
      group.appendChild(field);
    });
    
    container.appendChild(group);
  },
  
  createAttributeEditors: function(element, container) {
    const group = document.createElement('div');
    group.className = 'property-group';
    
    const header = document.createElement('h4');
    header.textContent = 'Attributes';
    group.appendChild(header);
    
    // Common attributes based on element type
    const commonAttrs = this.getCommonAttributes(element.tagName);
    const currentAttrs = element.$attributes.get();
    
    commonAttrs.forEach(attr => {
      const field = document.createElement('div');
      field.className = 'property-field';
      
      const label = document.createElement('label');
      label.textContent = attr.label + ':';
      
      const input = document.createElement('input');
      input.type = attr.type || 'text';
      input.value = currentAttrs[attr.name] || '';
      if (attr.placeholder) input.placeholder = attr.placeholder;
      
      let timeout;
      input.oninput = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const newAttrs = { ...element.$attributes.get() };
          newAttrs[attr.name] = input.value;
          element.$attributes.set(newAttrs);
        }, 300);
      };
      
      field.appendChild(label);
      field.appendChild(input);
      group.appendChild(field);
    });
    
    container.appendChild(group);
  },
  
  updateToolbarState: function(canUndo, canRedo) {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  },
  
  // Utility methods
  findElementById: function(id, elements = null) {
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
  },
  
  getElementDefaults: function(tagName) {
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
      },
      input: {
        attributes: { type: 'text', placeholder: 'Enter text...' },
        style: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }
      },
      img: {
        attributes: { src: 'https://via.placeholder.com/150x100', alt: 'Placeholder' },
        style: { maxWidth: '100%', height: 'auto' }
      },
      a: {
        textContent: 'Link Text',
        attributes: { href: '#' },
        style: { color: '#007bff', textDecoration: 'underline' }
      }
    };
    
    return defaults[tagName] || { textContent: `New ${tagName}`, style: {} };
  },
  
  getCommonAttributes: function(tagName) {
    const attributes = {
      input: [
        { name: 'type', label: 'Type', placeholder: 'text, email, password, etc.' },
        { name: 'placeholder', label: 'Placeholder' },
        { name: 'value', label: 'Value' }
      ],
      img: [
        { name: 'src', label: 'Source URL' },
        { name: 'alt', label: 'Alt Text' }
      ],
      a: [
        { name: 'href', label: 'Link URL' },
        { name: 'target', label: 'Target', placeholder: '_blank, _self, etc.' }
      ]
    };
    
    return attributes[tagName] || [];
  },
  
  // History management
  addToHistory: function(action) {
    this.history.push(action);
    this.redoStack = [];
    
    // Update computed signals (they will trigger effects automatically)
    // Force re-computation by getting the values
    this.$canUndo.get();
    this.$canRedo.get();
  },
  
  undo: function() {
    if (this.history.length === 0) return;
    
    const action = this.history.pop();
    if (action.undo) {
      action.undo();
    }
    this.redoStack.push(action);
    
    console.log('Undo performed');
  },
  
  redo: function() {
    if (this.redoStack.length === 0) return;
    
    const action = this.redoStack.pop();
    if (action.redo || action.execute) {
      (action.redo || action.execute)();
    }
    this.history.push(action);
    
    console.log('Redo performed');
  },
  
  exportStructure: function() {
    const doc = this.$document.get();
    
    // Convert reactive elements to plain objects for export
    const exportDoc = this.serializeForExport(doc);
    
    const dataStr = JSON.stringify(exportDoc, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'signal-based-ddom-structure.json';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Structure exported');
  },
  
  serializeForExport: function(obj) {
    if (obj && typeof obj === 'object') {
      if (typeof obj.get === 'function') {
        // This is a Signal, get its value
        return this.serializeForExport(obj.get());
      } else if (Array.isArray(obj)) {
        return obj.map(item => this.serializeForExport(item));
      } else {
        const result = {};
        Object.keys(obj).forEach(key => {
          if (!key.startsWith('$') && !key.startsWith('_')) {
            result[key] = this.serializeForExport(obj[key]);
          } else if (key.startsWith('$')) {
            // Convert reactive property to regular property
            const plainKey = key.slice(1);
            result[plainKey] = this.serializeForExport(obj[key]);
          }
        });
        return result;
      }
    }
    return obj;
  },
  
  removeElementById: function(id) {
    const doc = this.$document.get();
    const newChildren = doc.document.body.children.filter(child => child.id !== id);
    
    const newDoc = {
      ...doc,
      document: {
        ...doc.document,
        body: {
          ...doc.document.body,
          children: newChildren
        }
      }
    };
    
    this.$document.set(newDoc);
    
    // Clear selection if this element was selected
    if (this.$selectedElementId.get() === id) {
      this.$selectedElementId.set(null);
    }
  },
  
  // Cleanup
  dispose: function() {
    if (this.watcher) {
      this.watcher.dispose();
    }
  }
};