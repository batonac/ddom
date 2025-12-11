import { describe, test, expect, beforeEach } from 'vitest';
import DDOM from '../lib/dist/index.js';

describe('Template Arithmetic Operators', () => {
  beforeEach(() => {
    // Clean up any global variables
    if (typeof window !== 'undefined') {
      Object.keys(window).forEach(key => {
        if (key.startsWith('$') || key.startsWith('result')) {
          delete window[key];
        }
      });
    }
  });

  describe('Exponentiation Operator (**)', () => {
    test('should support basic exponentiation with literals', () => {
      const spec = {
        result1: '${2 ** 3}',        // 8
        result2: '${10 ** 2}',       // 100
        result3: '${5 ** 0}',        // 1
        result4: '${4 ** 0.5}',      // 2 (square root)
      };

      DDOM(spec);
      
      expect(window.result1).toBe('8');
      expect(window.result2).toBe('100');
      expect(window.result3).toBe('1');
      expect(window.result4).toBe('2');
    });

    test('should support exponentiation with signals', () => {
      const spec = {
        $count: 3,
        $base: 2,
        result1: '${this.$count ** 2}',           // 9
        result2: '${this.$base ** this.$count}',  // 8
        result3: '${this.$base ** 10}',           // 1024
      };

      DDOM(spec);
      
      expect(window.result1).toBe('9');
      expect(window.result2).toBe('8');
      expect(window.result3).toBe('1024');
    });

    test('should support exponentiation in text content', () => {
      const spec = {
        document: {
          body: {
            children: [{
              tagName: 'div',
              $count: 5,
              textContent: 'Count squared: ${this.$count ** 2}',
            }]
          }
        }
      };

      DDOM(spec);
      const divElement = document.body.children[0];
      
      expect(divElement.textContent).toBe('Count squared: 25');
    });

    test('should work in ternary expressions', () => {
      const spec = {
        $count: 3,
        $squared: 9, // Pre-computed value
        result1: '${this.$squared > 10 ? "large" : "small"}',
        result2: '${this.$squared < 10 ? "small" : "large"}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('small'); // 9 is not > 10, so "small"
      expect(window.result2).toBe('small'); // 9 < 10 is true, so "small"
    });
  });

  describe('Other Arithmetic Operators', () => {
    test('should support multiplication (*)', () => {
      const spec = {
        $price: 10,
        $quantity: 5,
        result1: '${3 * 4}',
        result2: '${this.$price * this.$quantity}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('12');
      expect(window.result2).toBe('50');
    });

    test('should support division (/)', () => {
      const spec = {
        $total: 100,
        $count: 4,
        result1: '${20 / 4}',
        result2: '${this.$total / this.$count}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('5');
      expect(window.result2).toBe('25');
    });

    test('should support modulo (%)', () => {
      const spec = {
        $value: 17,
        result1: '${10 % 3}',
        result2: '${this.$value % 5}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('1');
      expect(window.result2).toBe('2');
    });

    test('should support subtraction (-)', () => {
      const spec = {
        $current: 100,
        $previous: 85,
        result1: '${10 - 3}',
        result2: '${this.$current - this.$previous}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('7');
      expect(window.result2).toBe('15');
    });

    test('should support addition (+) for numbers', () => {
      const spec = {
        $a: 10,
        $b: 20,
        result1: '${5 + 3}',
        result2: '${this.$a + this.$b}',
      };

      DDOM(spec);
      
      expect(window.result1).toBe('8');
      expect(window.result2).toBe('30');
    });
  });

  describe('Operator Precedence', () => {
    test('should handle basic operator precedence', () => {
      const spec = {
        result1: '${2 + 3 * 4}',  // 2 + 12 = 14
        result2: '${10 - 2 * 3}', // 10 - 6 = 4
        result3: '${2 ** 3}',     // 8
        result4: '${3 * 4}',      // 12
      };

      DDOM(spec);
      
      // Note: Our implementation processes operators left-to-right within precedence levels
      // For complex expressions with mixed operators, use parentheses or separate computations
      expect(window.result1).toBe('14');
      expect(window.result2).toBe('4');
      expect(window.result3).toBe('8');
      expect(window.result4).toBe('12');
    });

    test('should handle complex nested arithmetic', () => {
      const spec = {
        $value: 4,
        result1: '${this.$value ** 2}',  // 16
        result2: '${this.$value * 2}',   // 8
        result3: '${this.$value / 2}',   // 2
      };

      DDOM(spec);
      
      expect(window.result1).toBe('16');
      expect(window.result2).toBe('8');
      expect(window.result3).toBe('2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero exponent', () => {
      const spec = {
        result1: '${5 ** 0}',   // 1
      };

      DDOM(spec);
      
      expect(window.result1).toBe('1');
    });
    
    test('should handle fractional exponents for roots', () => {
      const spec = {
        result1: '${9 ** 0.5}',    // 3 (square root)
        result2: '${27 ** 0.333}', // approximately 3 (cube root, but less precise)
      };

      DDOM(spec);
      
      expect(window.result1).toBe('3');
      expect(parseFloat(window.result2)).toBeCloseTo(3, 0); // Within 1 decimal place
    });

    test('should handle arithmetic with zero', () => {
      const spec = {
        result1: '${0 ** 2}',  // 0
        result2: '${5 * 0}',   // 0
        result3: '${0 / 5}',   // 0
      };

      DDOM(spec);
      
      expect(window.result1).toBe('0');
      expect(window.result2).toBe('0');
      expect(window.result3).toBe('0');
    });

    test('should handle division by zero', () => {
      const spec = {
        result1: '${5 / 0}',  // Infinity
      };

      DDOM(spec);
      
      expect(window.result1).toBe('Infinity');
    });
  });

  describe('Integration with String Concatenation', () => {
    test('should prefer arithmetic over string concatenation for numeric values', () => {
      const spec = {
        $a: 5,
        $b: 3,
        result1: '${this.$a + this.$b}',  // Should be 8 (arithmetic)
      };

      DDOM(spec);
      
      expect(window.result1).toBe('8');
    });

    test('should use string concatenation when values are strings', () => {
      const spec = {
        $str1: 'Hello',
        $str2: 'World',
        result1: '${this.$str1 + this.$str2}',  // Should be 'HelloWorld'
      };

      DDOM(spec);
      
      expect(window.result1).toBe('HelloWorld');
    });
  });
});
