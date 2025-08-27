// Tests for Visual Page Builder Conventions and Signal-Based Implementation

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Visual Page Builder - Signal-Based Approach', () => {
  let mockDOM;
  let mockDDOM;
  let mockSignal;
  let mockWatcher;
  
  beforeEach(() => {
    // Reset mocks
    mockDOM = {};
    
    // Mock DOM environment more completely
    const mockElement = () => ({
      tagName: 'DIV',
      style: {},
      classList: { 
        add: vi.fn(), 
        remove: vi.fn(),
        contains: vi.fn()
      },
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      innerHTML: '',
      textContent: '',
      onclick: null,
      id: '',
      className: ''
    });
    
    global.document = {
      getElementById: vi.fn((id) => mockDOM[id] || null),
      createElement: vi.fn((tag) => ({
        ...mockElement(),
        tagName: tag.toUpperCase()
      })),
      body: {
        ...mockElement(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        innerHTML: ''
      }
    };
    
    // Mock Signal system
    mockSignal = {
      State: class MockState {
        constructor(initialValue) {
          this.value = initialValue;
        }
        get() { return this.value; }
        set(newValue) { this.value = newValue; }
      },
      Computed: class MockComputed {
        constructor(fn) {
          this.fn = fn;
        }
        get() { return this.fn(); }
      }
    };
    
    mockWatcher = {
      dispose: () => {}
    };
    
    // Mock DDOM
    mockDDOM = {
      Signal: mockSignal,
      ComponentSignalWatcher: class MockComponentSignalWatcher {
        dispose() {}
      },
      createEffect: (fn, watcher) => {
        // Simple immediate execution for testing
        fn();
        return () => {};
      },
      createElement: (spec) => {
        const element = global.document.createElement(spec.tagName || 'div');
        if (spec.id) element.id = spec.id;
        if (spec.textContent) element.textContent = spec.textContent;
        if (spec.className) element.className = spec.className;
        return element;
      }
    };
    
    global.window = { DDOM: mockDDOM };
  });
  
  afterEach(() => {
    delete global.document;
    delete global.window;
  });
  
  test('should initialize reactive state with Signals', () => {
    const builder = createMockBuilder();
    
    expect(builder.$document).toBeDefined();
    expect(builder.$selectedElementId).toBeDefined();
    expect(builder.$selectedElement).toBeDefined();
    expect(typeof builder.$document.get).toBe('function');
    expect(typeof builder.$selectedElementId.get).toBe('function');
  });
  
  test('should create reactive elements with Signal properties', () => {
    const builder = createMockBuilder();
    const elementType = { name: 'Paragraph', tagName: 'p' };
    
    const element = builder.createReactiveElement(elementType);
    
    expect(element.tagName).toBe('p');
    expect(element.id).toMatch(/^element-/);
    expect(element.$textContent).toBeDefined();
    expect(element.$style).toBeDefined();
    expect(element.$attributes).toBeDefined();
    expect(typeof element.$textContent.get).toBe('function');
    expect(typeof element.$textContent.set).toBe('function');
  });
  
  test('should update document state when adding elements', () => {
    const builder = createMockBuilder();
    const elementType = { name: 'Heading 1', tagName: 'h1' };
    
    const initialChildren = builder.$document.get().document.body.children;
    expect(initialChildren).toHaveLength(0);
    
    builder.addElement(elementType);
    
    const newChildren = builder.$document.get().document.body.children;
    expect(newChildren).toHaveLength(1);
    expect(newChildren[0].tagName).toBe('h1');
    expect(newChildren[0].$textContent.get()).toBe('Heading 1');
  });
  
  test('should handle element selection with computed properties', () => {
    const builder = createMockBuilder();
    const elementType = { name: 'Button', tagName: 'button' };
    
    builder.addElement(elementType);
    const element = builder.$document.get().document.body.children[0];
    
    // Initially no selection
    expect(builder.$selectedElementId.get()).toBeNull();
    expect(builder.$selectedElement.get()).toBeNull();
    
    // Select element
    builder.$selectedElementId.set(element.id);
    
    // Computed property should update
    expect(builder.$selectedElement.get()).toBe(element);
    expect(builder.$selectedElement.get().tagName).toBe('button');
  });
  
  test('should manage undo/redo state with computed properties', () => {
    const builder = createMockBuilder();
    
    // Initially cannot undo or redo
    expect(builder.$canUndo.get()).toBe(false);
    expect(builder.$canRedo.get()).toBe(false);
    
    // Add action to history
    builder.addToHistory({
      type: 'test-action',
      undo: () => {}
    });
    
    expect(builder.$canUndo.get()).toBe(true);
    expect(builder.$canRedo.get()).toBe(false);
    
    // Perform undo
    builder.undo();
    
    expect(builder.$canUndo.get()).toBe(false);
    expect(builder.$canRedo.get()).toBe(true);
  });
  
  test('should serialize reactive elements for export', () => {
    const builder = createMockBuilder();
    
    // Create element with reactive properties
    const element = {
      tagName: 'div',
      id: 'test-element',
      $textContent: new mockSignal.State('Hello World'),
      $style: new mockSignal.State({ color: 'blue' }),
      _editorMeta: { created: Date.now() }
    };
    
    const serialized = builder.serializeForExport(element);
    
    expect(serialized.tagName).toBe('div');
    expect(serialized.id).toBe('test-element');
    expect(serialized.textContent).toBe('Hello World');
    expect(serialized.style.color).toBe('blue');
    expect(serialized._editorMeta).toBeUndefined(); // Should be filtered out
    expect(serialized.$textContent).toBeUndefined(); // Should be converted to textContent
  });
  
  test('should handle nested reactive properties', () => {
    const builder = createMockBuilder();
    
    const nestedObject = {
      level1: {
        $signal: new mockSignal.State('test value'),
        level2: {
          $anotherSignal: new mockSignal.State({ nested: 'data' })
        }
      }
    };
    
    const serialized = builder.serializeForExport(nestedObject);
    
    expect(serialized.level1.signal).toBe('test value');
    expect(serialized.level1.level2.anotherSignal.nested).toBe('data');
  });
  
  test('should provide element defaults based on tag type', () => {
    const builder = createMockBuilder();
    
    const h1Defaults = builder.getElementDefaults('h1');
    expect(h1Defaults.textContent).toBe('Heading 1');
    expect(h1Defaults.style.fontSize).toBe('2em');
    
    const pDefaults = builder.getElementDefaults('p');
    expect(pDefaults.textContent).toBe('This is a paragraph.');
    expect(pDefaults.style.lineHeight).toBe('1.5');
    
    const unknownDefaults = builder.getElementDefaults('unknown');
    expect(unknownDefaults.textContent).toBe('New unknown');
  });
  
  test('should find elements by ID in nested structures', () => {
    const builder = createMockBuilder();
    
    // Create nested structure
    const doc = {
      document: {
        body: {
          children: [
            { id: 'element-1', tagName: 'div' },
            { 
              id: 'element-2', 
              tagName: 'section',
              children: [
                { id: 'element-3', tagName: 'p' }
              ]
            }
          ]
        }
      }
    };
    
    builder.$document.set(doc);
    
    expect(builder.findElementById('element-1')).toBe(doc.document.body.children[0]);
    expect(builder.findElementById('element-2')).toBe(doc.document.body.children[1]);
    expect(builder.findElementById('element-3')).toBe(doc.document.body.children[1].children[0]);
    expect(builder.findElementById('nonexistent')).toBeNull();
  });
  
  test('should handle reactive property updates', () => {
    const builder = createMockBuilder();
    const element = builder.createReactiveElement({ name: 'Test', tagName: 'div' });
    
    // Initial values
    expect(element.$textContent.get()).toBe('New div');
    expect(element.$style.get()).toEqual({});
    
    // Update text content
    element.$textContent.set('Updated text');
    expect(element.$textContent.get()).toBe('Updated text');
    
    // Update style
    element.$style.set({ color: 'red', fontSize: '16px' });
    expect(element.$style.get()).toEqual({ color: 'red', fontSize: '16px' });
    
    // Update nested style property
    const currentStyle = element.$style.get();
    element.$style.set({ ...currentStyle, backgroundColor: 'blue' });
    expect(element.$style.get().backgroundColor).toBe('blue');
    expect(element.$style.get().color).toBe('red'); // Should preserve existing
  });
  
  // Helper function to create a mock builder
  function createMockBuilder() {
    return {
      // Initialize reactive state
      $document: new mockSignal.State({
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
      }),
      
      $selectedElementId: new mockSignal.State(null),
      
      get $selectedElement() {
        return new mockSignal.Computed(() => {
          const id = this.$selectedElementId.get();
          return id ? this.findElementById(id) : null;
        });
      },
      
      history: [],
      redoStack: [],
      
      get $canUndo() {
        return new mockSignal.Computed(() => this.history.length > 0);
      },
      
      get $canRedo() {
        return new mockSignal.Computed(() => this.redoStack.length > 0);
      },
      
      createReactiveElement: function(elementType) {
        const defaults = this.getElementDefaults(elementType.tagName);
        
        return {
          tagName: elementType.tagName,
          id: 'element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          
          $textContent: new mockSignal.State(defaults.textContent || ''),
          $style: new mockSignal.State(defaults.style || {}),
          $attributes: new mockSignal.State(defaults.attributes || {}),
          
          _editorMeta: {
            created: Date.now(),
            type: elementType.name
          }
        };
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
        
        this.$document.set(newDoc);
        this.$selectedElementId.set(newElement.id);
        
        this.addToHistory({
          type: 'add-element',
          element: newElement,
          undo: () => this.removeElementById(newElement.id)
        });
        
        return newElement;
      },
      
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
          }
        };
        
        return defaults[tagName] || { textContent: `New ${tagName}`, style: {} };
      },
      
      serializeForExport: function(obj) {
        if (obj && typeof obj === 'object') {
          if (typeof obj.get === 'function') {
            return this.serializeForExport(obj.get());
          } else if (Array.isArray(obj)) {
            return obj.map(item => this.serializeForExport(item));
          } else {
            const result = {};
            Object.keys(obj).forEach(key => {
              if (!key.startsWith('$') && !key.startsWith('_')) {
                result[key] = this.serializeForExport(obj[key]);
              } else if (key.startsWith('$')) {
                const plainKey = key.slice(1);
                result[plainKey] = this.serializeForExport(obj[key]);
              }
            });
            return result;
          }
        }
        return obj;
      },
      
      addToHistory: function(action) {
        this.history.push(action);
        this.redoStack = [];
      },
      
      undo: function() {
        if (this.history.length === 0) return;
        
        const action = this.history.pop();
        if (action.undo) {
          action.undo();
        }
        this.redoStack.push(action);
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
        
        if (this.$selectedElementId.get() === id) {
          this.$selectedElementId.set(null);
        }
      }
    };
  }
});