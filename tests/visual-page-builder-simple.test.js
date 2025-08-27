// Simple validation tests for Visual Page Builder Conventions

import { describe, test, expect } from 'vitest';

describe('Visual Page Builder - Core Concepts', () => {
  
  test('should demonstrate signal-based reactive properties', () => {
    // Mock Signal implementation for testing
    class MockSignal {
      constructor(initialValue) {
        this.value = initialValue;
      }
      
      get() {
        return this.value;
      }
      
      set(newValue) {
        this.value = newValue;
      }
    }
    
    class MockComputed {
      constructor(fn) {
        this.fn = fn;
      }
      
      get() {
        return this.fn();
      }
    }
    
    // Create reactive element
    const element = {
      tagName: 'div',
      id: 'test-element',
      $textContent: new MockSignal('Hello World'),
      $style: new MockSignal({ color: 'blue' })
    };
    
    // Test initial values
    expect(element.$textContent.get()).toBe('Hello World');
    expect(element.$style.get().color).toBe('blue');
    
    // Test updates
    element.$textContent.set('Updated text');
    expect(element.$textContent.get()).toBe('Updated text');
    
    element.$style.set({ color: 'red', fontSize: '16px' });
    expect(element.$style.get().color).toBe('red');
    expect(element.$style.get().fontSize).toBe('16px');
  });
  
  test('should demonstrate computed property patterns', () => {
    class MockSignal {
      constructor(initialValue) {
        this.value = initialValue;
      }
      get() { return this.value; }
      set(newValue) { this.value = newValue; }
    }
    
    class MockComputed {
      constructor(fn) {
        this.fn = fn;
      }
      get() { return this.fn(); }
    }
    
    // Builder state
    const $selectedElementId = new MockSignal(null);
    const elements = {
      'element-1': { id: 'element-1', tagName: 'div' },
      'element-2': { id: 'element-2', tagName: 'p' }
    };
    
    // Computed property for selected element
    const $selectedElement = new MockComputed(() => {
      const id = $selectedElementId.get();
      return id ? elements[id] : null;
    });
    
    // Test selection
    expect($selectedElement.get()).toBeNull();
    
    $selectedElementId.set('element-1');
    expect($selectedElement.get()).toBe(elements['element-1']);
    expect($selectedElement.get().tagName).toBe('div');
    
    $selectedElementId.set('element-2');
    expect($selectedElement.get()).toBe(elements['element-2']);
    expect($selectedElement.get().tagName).toBe('p');
  });
  
  test('should demonstrate element addressing patterns', () => {
    // Path-based addressing
    const elementPath = ['document', 'body', 'children', 0, 'children', 2];
    expect(elementPath).toHaveLength(6);
    expect(elementPath[0]).toBe('document');
    expect(elementPath[3]).toBe(0);
    
    // ID-based addressing  
    const elementId = 'element-12345';
    expect(elementId).toMatch(/^element-/);
    
    // Compound addressing
    const selection = {
      elementId: 'element-12345',
      propertyPath: ['style', 'backgroundColor']
    };
    expect(selection.elementId).toBe('element-12345');
    expect(selection.propertyPath).toEqual(['style', 'backgroundColor']);
  });
  
  test('should demonstrate serialization patterns', () => {
    class MockSignal {
      constructor(initialValue) {
        this.value = initialValue;
      }
      get() { return this.value; }
      set(newValue) { this.value = newValue; }
    }
    
    // Reactive element with signals
    const reactiveElement = {
      tagName: 'div',
      id: 'test-element', 
      $textContent: new MockSignal('Hello World'),
      $style: new MockSignal({ color: 'blue' }),
      _editorMeta: { created: Date.now() }
    };
    
    // Serialization function
    function serializeForExport(obj) {
      if (obj && typeof obj === 'object') {
        if (typeof obj.get === 'function') {
          // This is a Signal, get its value
          return serializeForExport(obj.get());
        } else if (Array.isArray(obj)) {
          return obj.map(item => serializeForExport(item));
        } else {
          const result = {};
          Object.keys(obj).forEach(key => {
            if (!key.startsWith('$') && !key.startsWith('_')) {
              result[key] = serializeForExport(obj[key]);
            } else if (key.startsWith('$')) {
              // Convert reactive property to regular property
              const plainKey = key.slice(1);
              result[plainKey] = serializeForExport(obj[key]);
            }
          });
          return result;
        }
      }
      return obj;
    }
    
    const serialized = serializeForExport(reactiveElement);
    
    expect(serialized.tagName).toBe('div');
    expect(serialized.id).toBe('test-element');
    expect(serialized.textContent).toBe('Hello World');
    expect(serialized.style.color).toBe('blue');
    expect(serialized._editorMeta).toBeUndefined(); // Should be filtered out
    expect(serialized.$textContent).toBeUndefined(); // Should be converted to textContent
  });
  
  test('should demonstrate command pattern for undo/redo', () => {
    class UpdatePropertyCommand {
      constructor(element, property, newValue, oldValue) {
        this.element = element;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = oldValue;
      }
      
      execute() {
        this.element[this.property] = this.newValue;
      }
      
      undo() {
        this.element[this.property] = this.oldValue;
      }
    }
    
    // Test element
    const element = { textContent: 'Original text' };
    
    // Create command
    const command = new UpdatePropertyCommand(
      element,
      'textContent',
      'New text',
      'Original text'
    );
    
    // Execute
    command.execute();
    expect(element.textContent).toBe('New text');
    
    // Undo
    command.undo();
    expect(element.textContent).toBe('Original text');
  });
  
  test('should demonstrate proxy-based editing approach', () => {
    // Simplified proxy test to demonstrate the concept
    const sourceElement = {
      tagName: 'div',
      textContent: 'Original text'
    };
    
    const metadata = {
      selected: false,
      editHistory: []
    };
    
    const editableElement = new Proxy(sourceElement, {
      get: (target, prop) => {
        if (prop === 'metadata') {
          return metadata;
        }
        return target[prop];
      },
      
      set: (target, prop, value) => {
        const oldValue = target[prop];
        target[prop] = value;
        metadata.editHistory.push({
          property: prop,
          oldValue: oldValue,
          newValue: value,
          timestamp: Date.now()
        });
        return true;
      }
    });
    
    // Test property access
    expect(editableElement.tagName).toBe('div');
    expect(editableElement.textContent).toBe('Original text');
    
    // Test property updates
    editableElement.textContent = 'Updated text';
    expect(editableElement.textContent).toBe('Updated text');
    expect(sourceElement.textContent).toBe('Updated text');
    expect(editableElement.metadata.editHistory).toHaveLength(1);
    expect(editableElement.metadata.editHistory[0].property).toBe('textContent');
    expect(editableElement.metadata.editHistory[0].oldValue).toBe('Original text');
    expect(editableElement.metadata.editHistory[0].newValue).toBe('Updated text');
  });
  
  test('should validate element defaults and type system', () => {
    function getElementDefaults(tagName) {
      const defaults = {
        h1: { 
          textContent: 'Heading 1', 
          style: { color: '#333', fontSize: '2em', margin: '0.5em 0' } 
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
            borderRadius: '4px' 
          } 
        }
      };
      
      return defaults[tagName] || { textContent: `New ${tagName}`, style: {} };
    }
    
    const h1Defaults = getElementDefaults('h1');
    expect(h1Defaults.textContent).toBe('Heading 1');
    expect(h1Defaults.style.fontSize).toBe('2em');
    
    const pDefaults = getElementDefaults('p');
    expect(pDefaults.textContent).toBe('This is a paragraph.');
    expect(pDefaults.style.lineHeight).toBe('1.5');
    
    const unknownDefaults = getElementDefaults('unknown');
    expect(unknownDefaults.textContent).toBe('New unknown');
    expect(unknownDefaults.style).toEqual({});
  });
});