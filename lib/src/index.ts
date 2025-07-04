import { adoptDocument, adoptNode, adoptWindow, appendChild, createElement } from './elements/elements';
import { adoptStyleSheet, clearStyleSheet } from './styleSheets/styleSheets';
import { define } from './customElements/customElements';
import { MappedArray } from './arrays/arrays';
import { createEffect, createReactiveProperty, ComponentSignalWatcher } from './events/Signal';
import { Signal } from 'signal-polyfill';
import { parseTemplateLiteral, bindTemplate, computedTemplate, isTemplateLiteral, bindPropertyTemplate, bindAttributeTemplate } from './templates/templates';
import { isPropertyAccessor, resolvePropertyAccessor } from './accessors/accessors';

// Named exports for compatibility
export { adoptDocument, adoptNode, adoptWindow, createElement } from './elements/elements';
export { adoptStyleSheet, clearStyleSheet } from './styleSheets/styleSheets';
export { define } from './customElements/customElements';
export { createEffect, createReactiveProperty, ComponentSignalWatcher } from './events/Signal';
export { Signal } from 'signal-polyfill';
export { MappedArray } from './arrays/arrays';
export { parseTemplateLiteral, bindTemplate, computedTemplate, isTemplateLiteral, bindPropertyTemplate, bindAttributeTemplate } from './templates/templates';
export { isPropertyAccessor, resolvePropertyAccessor } from './accessors/accessors';

// Default export: DDOM function with namespace properties
function DDOM(spec: any) {
	adoptWindow(spec);
}

// Add all methods as properties on the DDOM function
Object.assign(DDOM, {
	adoptDocument,
	adoptNode,
	adoptStyleSheet,
	adoptWindow,
	appendChild,
	clearStyleSheet,
	createElement,
	customElements: {
		define
	},
	createEffect,
	createReactiveProperty,
	ComponentSignalWatcher,
	MappedArray,
	Signal,
	parseTemplateLiteral,
	bindTemplate,
	computedTemplate,
	isTemplateLiteral,
	bindPropertyTemplate,
	bindAttributeTemplate
});

export default DDOM;

// Create global DDOM namespace when script loads
declare global {
	interface Window {
		DDOM: typeof DDOM;
		MappedArray: typeof MappedArray;
		Signal: typeof Signal;
	}
}

// Auto-expose DDOM namespace globally
if (typeof window !== 'undefined') {
	window.DDOM = DDOM;
	window.MappedArray = MappedArray;
	window.Signal = Signal;
}