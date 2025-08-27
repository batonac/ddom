# AST-Based Visual Page Builder Approach

The AST-based approach converts DDOM objects to Abstract Syntax Trees for manipulation, enabling advanced code generation and manipulation capabilities. This approach is ideal for sophisticated developer tools and code editors.

## Architecture

### Core Concepts

1. **AST Representation** - DDOM objects converted to Abstract Syntax Trees
2. **JSONPath Addressing** - Elements addressed using JSONPath expressions
3. **Code Generation** - Compile AST back to JavaScript code
4. **Advanced Transformations** - Structural code modifications

### Key Components

```javascript
import * as parser from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

class ASTBasedPageBuilder {
  constructor() {
    this.sourceCode = '';
    this.ast = null;
    this.elementMap = new Map(); // JSONPath -> AST Node
    this.selectedPath = null;
    this.history = [];
  }
  
  loadFromCode(sourceCode) {
    this.sourceCode = sourceCode;
    this.ast = this.parseToAST(sourceCode);
    this.buildElementMap();
    this.renderFromAST();
  }
  
  parseToAST(code) {
    try {
      return parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'objectRestSpread']
      });
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse DDOM code: ${error.message}`);
    }
  }
}
```

## Implementation Example

### AST Element Mapping

```javascript
buildElementMap() {
  this.elementMap.clear();
  
  traverse(this.ast, {
    ObjectExpression: (path) => {
      const node = path.node;
      
      // Check if this looks like a DDOM element
      if (this.isDDOMElement(node)) {
        const jsonPath = this.getJSONPath(path);
        const elementId = this.extractElementId(node);
        
        this.elementMap.set(jsonPath, {
          astPath: path,
          elementId: elementId,
          type: this.getElementType(node),
          properties: this.extractProperties(node)
        });
      }
    }
  });
}

isDDOMElement(node) {
  return node.properties.some(prop => 
    t.isObjectProperty(prop) && 
    t.isIdentifier(prop.key) && 
    prop.key.name === 'tagName'
  );
}

getJSONPath(astPath) {
  const pathSegments = [];
  let current = astPath;
  
  while (current) {
    if (current.isObjectProperty()) {
      pathSegments.unshift(current.node.key.name || current.node.key.value);
    } else if (current.isArrayExpression()) {
      const index = current.parent.elements.indexOf(current.node);
      pathSegments.unshift(index);
    }
    
    current = current.parentPath;
  }
  
  return '$.' + pathSegments.join('.');
}
```

### Property Updates via AST

```javascript
updateElementProperty(jsonPath, propertyName, newValue) {
  const elementInfo = this.elementMap.get(jsonPath);
  if (!elementInfo) return;
  
  const astPath = elementInfo.astPath;
  const objectNode = astPath.node;
  
  // Find existing property or create new one
  let propertyNode = objectNode.properties.find(prop => 
    t.isObjectProperty(prop) && prop.key.name === propertyName
  );
  
  if (propertyNode) {
    // Update existing property
    const oldValue = this.nodeToValue(propertyNode.value);
    propertyNode.value = this.valueToNode(newValue);
    
    this.addToHistory({
      type: 'property-update',
      jsonPath: jsonPath,
      propertyName: propertyName,
      oldValue: oldValue,
      newValue: newValue
    });
  } else {
    // Add new property
    const newProperty = t.objectProperty(
      t.identifier(propertyName),
      this.valueToNode(newValue)
    );
    
    objectNode.properties.push(newProperty);
    
    this.addToHistory({
      type: 'property-add',
      jsonPath: jsonPath,
      propertyName: propertyName,
      value: newValue
    });
  }
  
  // Regenerate code and re-render
  this.regenerateCode();
  this.renderFromAST();
}

valueToNode(value) {
  if (typeof value === 'string') {
    return t.stringLiteral(value);
  } else if (typeof value === 'number') {
    return t.numericLiteral(value);
  } else if (typeof value === 'boolean') {
    return t.booleanLiteral(value);
  } else if (value === null) {
    return t.nullLiteral();
  } else if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return t.arrayExpression(value.map(item => this.valueToNode(item)));
    } else {
      const properties = Object.entries(value).map(([key, val]) =>
        t.objectProperty(t.identifier(key), this.valueToNode(val))
      );
      return t.objectExpression(properties);
    }
  }
  
  return t.identifier('undefined');
}

nodeToValue(node) {
  if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isNumericLiteral(node)) {
    return node.value;
  } else if (t.isBooleanLiteral(node)) {
    return node.value;
  } else if (t.isNullLiteral(node)) {
    return null;
  } else if (t.isArrayExpression(node)) {
    return node.elements.map(element => this.nodeToValue(element));
  } else if (t.isObjectExpression(node)) {
    const obj = {};
    node.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) {
        const key = prop.key.name || prop.key.value;
        obj[key] = this.nodeToValue(prop.value);
      }
    });
    return obj;
  }
  
  return undefined;
}
```

### Element Operations

```javascript
addElement(parentPath, elementSpec) {
  const parentInfo = this.elementMap.get(parentPath);
  if (!parentInfo) return;
  
  // Find or create children array
  let childrenProperty = parentInfo.astPath.node.properties.find(prop =>
    t.isObjectProperty(prop) && prop.key.name === 'children'
  );
  
  if (!childrenProperty) {
    // Create children array
    childrenProperty = t.objectProperty(
      t.identifier('children'),
      t.arrayExpression([])
    );
    parentInfo.astPath.node.properties.push(childrenProperty);
  }
  
  // Create new element AST node
  const newElementNode = this.createElementAST(elementSpec);
  
  // Add to children array
  if (t.isArrayExpression(childrenProperty.value)) {
    childrenProperty.value.elements.push(newElementNode);
  }
  
  // Update maps and regenerate
  this.buildElementMap();
  this.regenerateCode();
  this.renderFromAST();
  
  this.addToHistory({
    type: 'element-add',
    parentPath: parentPath,
    element: elementSpec
  });
}

createElementAST(elementSpec) {
  const properties = [];
  
  Object.entries(elementSpec).forEach(([key, value]) => {
    properties.push(
      t.objectProperty(
        t.identifier(key),
        this.valueToNode(value)
      )
    );
  });
  
  return t.objectExpression(properties);
}

removeElement(jsonPath) {
  const elementInfo = this.elementMap.get(jsonPath);
  if (!elementInfo) return;
  
  const astPath = elementInfo.astPath;
  const parent = astPath.parent;
  
  if (t.isArrayExpression(parent)) {
    const index = parent.elements.indexOf(astPath.node);
    if (index > -1) {
      parent.elements.splice(index, 1);
    }
  }
  
  // Clean up and regenerate
  this.elementMap.delete(jsonPath);
  this.regenerateCode();
  this.renderFromAST();
  
  this.addToHistory({
    type: 'element-remove',
    jsonPath: jsonPath,
    element: this.astToElement(astPath.node)
  });
}
```

### Code Generation

```javascript
regenerateCode() {
  try {
    const output = generate(this.ast, {
      retainLines: false,
      compact: false,
      minified: false
    });
    
    this.sourceCode = output.code;
    
    // Emit code change event
    this.dispatchEvent('ast-code-changed', {
      code: this.sourceCode,
      ast: this.ast
    });
    
    return this.sourceCode;
  } catch (error) {
    console.error('Code generation error:', error);
    throw new Error(`Failed to generate code: ${error.message}`);
  }
}

exportCode() {
  return {
    javascript: this.sourceCode,
    json: this.astToJSON(),
    ast: this.ast
  };
}

astToJSON() {
  // Convert AST to JSON representation
  const visitor = {
    ObjectExpression: (path) => {
      if (this.isDDOMElement(path.node)) {
        return this.astToElement(path.node);
      }
    }
  };
  
  let result = null;
  traverse(this.ast, {
    ExportDefaultDeclaration: (path) => {
      result = this.astToElement(path.node.declaration);
    }
  });
  
  return result;
}
```

## Advanced Features

### Code Transformation

```javascript
class CodeTransformer {
  constructor(ast) {
    this.ast = ast;
  }
  
  // Convert inline styles to CSS classes
  extractStylesToCSS() {
    const styles = new Map();
    let classCounter = 0;
    
    traverse(this.ast, {
      ObjectProperty: (path) => {
        if (path.node.key.name === 'style' && t.isObjectExpression(path.node.value)) {
          const styleObj = this.nodeToValue(path.node.value);
          const className = `auto-class-${++classCounter}`;
          
          styles.set(className, styleObj);
          
          // Replace style with className
          path.replaceWith(
            t.objectProperty(
              t.identifier('className'),
              t.stringLiteral(className)
            )
          );
        }
      }
    });
    
    return styles;
  }
  
  // Add responsive design properties
  makeResponsive() {
    traverse(this.ast, {
      ObjectExpression: (path) => {
        if (this.isDDOMElement(path.node)) {
          // Add responsive container wrapper
          const responsiveWrapper = t.objectProperty(
            t.identifier('responsive'),
            t.objectExpression([
              t.objectProperty(t.identifier('mobile'), t.objectExpression([])),
              t.objectProperty(t.identifier('tablet'), t.objectExpression([])),
              t.objectProperty(t.identifier('desktop'), t.objectExpression([]))
            ])
          );
          
          path.node.properties.push(responsiveWrapper);
        }
      }
    });
  }
  
  // Optimize for performance
  addLazyLoading() {
    traverse(this.ast, {
      ObjectProperty: (path) => {
        if (path.node.key.name === 'tagName' && 
            t.isStringLiteral(path.node.value) && 
            path.node.value.value === 'img') {
          
          // Add lazy loading attribute
          const parent = path.parent;
          if (t.isObjectExpression(parent)) {
            parent.properties.push(
              t.objectProperty(
                t.identifier('loading'),
                t.stringLiteral('lazy')
              )
            );
          }
        }
      }
    });
  }
}
```

### Advanced Querying

```javascript
class ASTQuery {
  constructor(ast) {
    this.ast = ast;
  }
  
  // Find elements by selector
  findElements(selector) {
    const results = [];
    
    if (selector.startsWith('#')) {
      // ID selector
      const id = selector.slice(1);
      this.findById(id, results);
    } else if (selector.startsWith('.')) {
      // Class selector
      const className = selector.slice(1);
      this.findByClass(className, results);
    } else {
      // Tag selector
      this.findByTag(selector, results);
    }
    
    return results;
  }
  
  findById(id, results) {
    traverse(this.ast, {
      ObjectProperty: (path) => {
        if (path.node.key.name === 'id' && 
            t.isStringLiteral(path.node.value) && 
            path.node.value.value === id) {
          results.push(path.parent);
        }
      }
    });
  }
  
  findByTag(tagName, results) {
    traverse(this.ast, {
      ObjectProperty: (path) => {
        if (path.node.key.name === 'tagName' && 
            t.isStringLiteral(path.node.value) && 
            path.node.value.value === tagName) {
          results.push(path.parent);
        }
      }
    });
  }
  
  // Get element statistics
  getStatistics() {
    const stats = {
      totalElements: 0,
      elementTypes: new Map(),
      maxDepth: 0,
      hasInlineStyles: false,
      hasCustomElements: false
    };
    
    traverse(this.ast, {
      ObjectExpression: (path) => {
        if (this.isDDOMElement(path.node)) {
          stats.totalElements++;
          
          const tagName = this.getTagName(path.node);
          if (tagName) {
            stats.elementTypes.set(tagName, (stats.elementTypes.get(tagName) || 0) + 1);
            
            if (tagName.includes('-')) {
              stats.hasCustomElements = true;
            }
          }
          
          if (this.hasInlineStyle(path.node)) {
            stats.hasInlineStyles = true;
          }
          
          const depth = this.getPathDepth(path);
          stats.maxDepth = Math.max(stats.maxDepth, depth);
        }
      }
    });
    
    return stats;
  }
}
```

## Integration with Development Tools

### Source Maps

```javascript
generateSourceMap() {
  const sourceMap = generate(this.ast, {
    sourceMaps: true,
    sourceFileName: 'builder-output.js'
  });
  
  return {
    code: sourceMap.code,
    map: sourceMap.map
  };
}
```

### TypeScript Support

```javascript
generateTypeScript() {
  // Add TypeScript type annotations
  const typeAnnotations = new Map([
    ['tagName', 'string'],
    ['textContent', 'string'],
    ['style', 'CSSStyleDeclaration'],
    ['attributes', 'Record<string, string>'],
    ['children', 'DDOMElement[]']
  ]);
  
  // Transform AST to include type information
  // Implementation depends on specific TypeScript requirements
}
```

## Benefits

1. **Code Generation** - Produces actual JavaScript/TypeScript code
2. **Advanced Transformations** - Structural code modifications
3. **Developer Tools** - Perfect for code editors and IDEs
4. **Analysis** - Deep code analysis and statistics
5. **Standards Compliance** - Uses standard JavaScript AST format

## Limitations

1. **Complexity** - Most complex approach to implement
2. **Performance** - Parsing and regenerating code is expensive
3. **Learning Curve** - Requires AST knowledge
4. **Overkill** - Too complex for simple visual builders

## When to Use

- **Developer Tools** that need to generate code
- **Advanced Editors** with code transformation features
- **Analysis Tools** that need to understand code structure
- **Code Generators** that produce DDOM applications
- **Migration Tools** that convert between formats

## Complete Example

See [`ast-based-builder.js`](./ast-based-builder.js) for a complete implementation of this approach.

## Related Libraries

- **@babel/parser** - JavaScript parser
- **@babel/traverse** - AST traversal
- **@babel/generate** - Code generation
- **@babel/types** - AST node types
- **JSONPath** - Element addressing
- **Recast** - Alternative AST tool with better source preservation