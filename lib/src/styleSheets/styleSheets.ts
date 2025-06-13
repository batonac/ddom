import {
	HTMLElementSpec,
	StyleExpr,
} from '../../../types/src';


// Global stylesheet reference for DDOM styles
let ddomStyleSheet: CSSStyleSheet | null = null;

// Custom media query registry
const customMediaQueries: Map<string, string> = new Map();

// Track custom media queries being resolved to detect circular dependencies
const resolving: Set<string> = new Set();

/**
 * Adopts or creates the global DDOM stylesheet.
 * Creates a new CSSStyleSheet and adds it to the document's adopted stylesheets
 * if one doesn't already exist. This allows for efficient CSS rule management.
 * 
 * @returns The global DDOM stylesheet instance
 * @example
 * ```typescript
 * const sheet = adoptStyleSheet();
 * sheet.insertRule('.my-class { color: red; }');
 * ```
 */
export function adoptStyleSheet(): CSSStyleSheet {
	if (!ddomStyleSheet) {
		ddomStyleSheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, ddomStyleSheet];
	}
	return ddomStyleSheet!;
}

/**
 * Clears all DDOM styles from the stylesheet.
 * This function removes all CSS rules from the global DDOM stylesheet,
 * effectively resetting all declarative styles.
 * 
 * @example
 * ```typescript
 * clearStyleSheet(); // Removes all DDOM-generated CSS rules
 * ```
 */
export function clearStyleSheet(): void {
	const sheet = adoptStyleSheet();
	while (sheet.cssRules.length > 0) {
		sheet.deleteRule(0);
	}
	// Also clear custom media queries
	customMediaQueries.clear();
}

/**
 * Registers a custom media query for use in @media rules.
 * Custom media queries are defined with @custom-media rules and can be referenced
 * in media contexts using the --name syntax.
 * 
 * @param name The custom media query name (must start with --)
 * @param value The media query value (media-query-list, true, or false)
 * @example
 * ```typescript
 * registerCustomMedia('--narrow', '(max-width: 30em)');
 * registerCustomMedia('--always', 'true');
 * ```
 */
function registerCustomMedia(name: string, value: string): void {
	if (!name.startsWith('--')) {
		console.warn(`Custom media query name "${name}" must start with --`);
		return;
	}
	
	// Store the custom media query (later declarations override earlier ones)
	customMediaQueries.set(name, value.trim());
}

/**
 * Resolves a custom media query to its actual media query value.
 * Handles circular dependency detection and recursive resolution.
 * 
 * @param name The custom media query name to resolve
 * @returns The resolved media query value or null if not found/circular
 */
function resolveCustomMedia(name: string): string | null {
	if (!customMediaQueries.has(name)) {
		return null;
	}
	
	if (resolving.has(name)) {
		console.warn(`Circular dependency detected in custom media query: ${name}`);
		return null;
	}
	
	resolving.add(name);
	let value = customMediaQueries.get(name)!;
	
	// Recursively resolve any nested custom media queries in the value
	value = value.replace(/\(--[\w-]+\)/g, (match) => {
		const nestedName = match.slice(1, -1); // Remove parentheses
		const resolved = resolveCustomMedia(nestedName);
		return resolved ? `(${resolved})` : 'not all';
	});
	
	resolving.delete(name);
	return value;
}

/**
 * Processes @media rules to resolve custom media queries.
 * Converts custom media query references to their actual values.
 * 
 * @param mediaQuery The media query string to process
 * @returns The processed media query with custom media queries resolved
 */
function resolveMediaQuery(mediaQuery: string): string {
	// Clear the resolving set for each top-level resolution
	resolving.clear();
	
	return mediaQuery.replace(/\(--[\w-]+\)/g, (match) => {
		const customName = match.slice(1, -1); // Remove parentheses
		const resolved = resolveCustomMedia(customName);
		
		if (resolved === null) {
			console.warn(`Undefined custom media query: ${customName}`);
			return 'not all'; // Fallback to prevent syntax errors
		}
		
		// Handle boolean values
		if (resolved === 'true') return 'all';
		if (resolved === 'false') return 'not all';
		
		// Wrap resolved query in parentheses for proper precedence
		return `(${resolved})`;
	});
}

/**
 * Checks if a key represents a CSS property (not a nested selector or at-rule).
 * Returns true for standard CSS properties, false for selectors like
 * pseudo-classes, media queries, at-rules, class/ID selectors, etc.
 * 
 * @param key The property key to check
 * @returns True if the key is a CSS property, false if it's a selector or at-rule
 * @example
 * ```typescript
 * isCSSProperty('color'); // true
 * isCSSProperty(':hover'); // false
 * isCSSProperty('.class'); // false
 * isCSSProperty('@media'); // false
 * isCSSProperty('@custom-media --narrow'); // false
 * ```
 */
function isCSSProperty(key: string): boolean {
	// CSS custom properties (variables) are valid CSS properties
	if (key.startsWith('--')) {
		return true;
	}
	
	return !key.startsWith(':') && !key.startsWith('@') && !key.includes(' ') &&
		!key.startsWith('.') && !key.startsWith('#') && !key.startsWith('[');
}

/**
 * Checks if a key represents a @custom-media rule.
 * 
 * @param key The property key to check
 * @returns True if the key is a @custom-media rule
 */
function isCustomMediaRule(key: string): boolean {
	return key.startsWith('@custom-media ') && key.includes('--');
}

/**
 * Flattens nested CSS styles into individual rules with full selectors.
 * This function recursively processes nested style objects and generates
 * flat CSS rules with proper selector hierarchies. Also handles @custom-media rules.
 * 
 * @param styles The nested declarative CSS properties object
 * @param baseSelector The base CSS selector to build upon
 * @returns Array of flattened CSS rules with selectors and properties
 * @example
 * ```typescript
 * flattenRules({
 *   color: 'red',
 *   ':hover': { backgroundColor: 'blue' },
 *   '@custom-media --narrow': '(max-width: 30em)',
 *   '@media (--narrow)': { fontSize: '14px' }
 * }, '.my-class');
 * // Returns: [
 * //   { selector: '.my-class', properties: { color: 'red' } },
 * //   { selector: '.my-class:hover', properties: { backgroundColor: 'blue' } },
 * //   { selector: '@media (max-width: 30em) { .my-class', properties: { fontSize: '14px' } }
 * // ]
 * ```
 */
function flattenRules(styles: StyleExpr, baseSelector: string): Array<{ selector: string; properties: { [key: string]: string }; mediaQuery?: string }> {
	const rules: Array<{ selector: string; properties: { [key: string]: string }; mediaQuery?: string }> = [];

	// First pass: process @custom-media rules
	for (const [key, value] of Object.entries(styles)) {
		if (isCustomMediaRule(key) && typeof value === 'string') {
			// Extract custom media name from key like "@custom-media --narrow"
			const match = key.match(/@custom-media\s+(--[\w-]+)/);
			if (match) {
				registerCustomMedia(match[1], value);
			}
		}
	}

	// Collect direct CSS properties
	const directProperties: { [key: string]: string } = {};

	// Second pass: process other rules
	for (const [key, value] of Object.entries(styles)) {
		if (isCSSProperty(key) && typeof value === 'string') {
			directProperties[key] = value;
		} else if (typeof value === 'object' && value !== null && !isCustomMediaRule(key)) {
			// Handle nested selectors
			let nestedSelector: string;

			if (key.startsWith(':') || key.startsWith('[')) {
				// Pseudo-selectors and attribute selectors
				nestedSelector = `${baseSelector}${key}`;
				const nestedRules = flattenRules(value as StyleExpr, nestedSelector);
				rules.push(...nestedRules);
			} else if (key.startsWith('@media')) {
				// Media queries - resolve custom media queries
				const mediaQuery = key.replace('@media ', '');
				const resolvedQuery = resolveMediaQuery(mediaQuery);
				
				// For media queries, process the nested styles with the base selector
				const mediaRules = flattenRules(value as StyleExpr, baseSelector);
				for (const rule of mediaRules) {
					rules.push({
						selector: rule.selector,
						properties: rule.properties,
						mediaQuery: resolvedQuery
					});
				}
			} else {
				// Element, Class, ID, or other selectors
				nestedSelector = `${baseSelector} ${key}`;
				const nestedRules = flattenRules(value as StyleExpr, nestedSelector);
				rules.push(...nestedRules);
			}
		}
	}

	// Add rule for direct properties if any exist
	if (Object.keys(directProperties).length > 0) {
		rules.push({ selector: baseSelector, properties: directProperties });
	}

	return rules;
}

/**
 * Inserts CSS rules into the DDOM stylesheet for an element.
 * This function processes declarative CSS styles and generates appropriate
 * CSS rules with proper selectors and nesting support. Also handles @custom-media rules.
 * 
 * @param styles The declarative CSS properties object
 * @param selector The CSS selector to apply the styles to
 * @example
 * ```typescript
 * insertRules({
 *   color: 'red',
 *   ':hover': { backgroundColor: 'blue' },
 *   '@custom-media --narrow': '(max-width: 30em)',
 *   '@media (--narrow)': { fontSize: '14px' }
 * }, '.my-component');
 * ```
 */
export function insertRules(styles: StyleExpr, selector: string): void {
	const sheet = adoptStyleSheet();
	const rules = flattenRules(styles, selector);

	for (const rule of rules) {
		try {
			// Handle media query rules specially
			if (rule.mediaQuery) {
				// Find or create media rule
				let mediaRule: CSSMediaRule | null = null;
				
				// Check if we already have a media rule with this query
				for (let i = 0; i < sheet.cssRules.length; i++) {
					const existingRule = sheet.cssRules[i];
					if (existingRule.type === CSSRule.MEDIA_RULE) {
						const existingMediaRule = existingRule as CSSMediaRule;
						if (existingMediaRule.conditionText === rule.mediaQuery) {
							mediaRule = existingMediaRule;
							break;
						}
					}
				}
				
				// Create new media rule if none exists
				if (!mediaRule) {
					const mediaRuleIndex = sheet.insertRule(`@media ${rule.mediaQuery} {}`, sheet.cssRules.length);
					mediaRule = sheet.cssRules[mediaRuleIndex] as CSSMediaRule;
				}
				
				// Insert the actual style rule inside the media rule
				const styleRuleIndex = mediaRule.insertRule(`${rule.selector} {}`, mediaRule.cssRules.length);
				const cssRule = mediaRule.cssRules[styleRuleIndex] as CSSStyleRule;
				
				// Apply properties
				for (const [property, value] of Object.entries(rule.properties)) {
					if (property.startsWith('--')) {
						cssRule.style.setProperty(property, value);
					} else {
						cssRule.style[property as any] = value;
					}
				}
			} else {
				// Handle regular rules
				const ruleIndex = sheet.insertRule(`${rule.selector} {}`, sheet.cssRules.length);
				const cssRule = sheet.cssRules[ruleIndex] as CSSStyleRule;

				// Apply properties using camelCase directly
				for (const [property, value] of Object.entries(rule.properties)) {
					if (property.startsWith('--')) {
						// CSS custom properties need special handling
						cssRule.style.setProperty(property, value);
					} else {
						cssRule.style[property as any] = value;
					}
				}
			}
		} catch (e) {
			console.warn('Failed to add CSS rule:', rule.selector, e);
		}
	}
}