# Enhanced Signal-Based Visual Page Builder

This example demonstrates the recommended signal-based approach for visual page builders, leveraging DDOM's built-in reactivity system for efficient updates.

## Features

- **Reactive State Management** - Uses DDOM Signals for automatic updates
- **Efficient DOM Updates** - Only changed elements are re-rendered
- **Command Pattern** - Full undo/redo support
- **Batch Updates** - Group changes for performance
- **Live Editing** - Inline text editing with real-time updates
- **Drag & Drop** - Element reordering with visual feedback

## Key Improvements Over Basic Builder

1. **Performance** - Uses reactive updates instead of full re-renders
2. **Memory Management** - Component watchers handle cleanup automatically
3. **Developer Experience** - Clear separation of concerns
4. **Extensibility** - Easy to add new reactive features

## Architecture

### Core Components

- `SignalPageBuilder` - Main builder class with reactive state
- `ReactiveElement` - Elements with Signal-based properties
- `CommandHistory` - Undo/redo with Signal integration
- `PropertyPanel` - Reactive property editors

### Signal Usage

```javascript
// Document state as a Signal
this.$document = new Signal.State(ddomStructure);

// Selection state
this.$selectedElementId = new Signal.State(null);

// Computed properties update automatically
this.$selectedElement = new Signal.Computed(() => {
  const id = this.$selectedElementId.get();
  return id ? this.findElementById(id) : null;
});
```

## Running the Example

1. Open `index.html` in a browser
2. Use the element palette to add components
3. Select elements to edit properties
4. Try drag & drop reordering
5. Use undo/redo functionality

## Implementation Highlights

### Reactive Element Properties

Each element has reactive properties that update the DOM automatically:

```javascript
const reactiveElement = {
  tagName: 'div',
  id: 'element-123',
  $textContent: new Signal.State('Hello World'),
  $style: new Signal.State({ color: 'blue' })
};

// Changes automatically update the DOM
reactiveElement.$textContent.set('Updated text');
reactiveElement.$style.set({ ...style, backgroundColor: 'yellow' });
```

### Efficient Updates

Only changed elements are updated in the DOM:

```javascript
createEffect(() => {
  const textContent = element.$textContent.get();
  domElement.textContent = textContent;
}, this.watcher);
```

### Command Pattern for History

All changes go through commands that support undo/redo:

```javascript
const command = new UpdatePropertyCommand(
  elementId, 
  'style.backgroundColor', 
  newValue, 
  oldValue
);
this.history.execute(command);
```

This demonstrates how to build performant, maintainable visual page builders using DDOM's reactive infrastructure.