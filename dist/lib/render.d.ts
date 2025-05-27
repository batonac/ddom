import { DeclarativeCustomElement, DeclarativeHTMLElement, DeclarativeWindow, DeclarativeDocument } from './../types';
export declare function buildElementTree(desc: DeclarativeHTMLElement | DeclarativeWindow | DeclarativeDocument, element?: HTMLBodyElement | HTMLElement | HTMLHeadElement | Document | Window): HTMLBodyElement | HTMLElement | HTMLHeadElement | Document | Window | null;
export declare function registerCustomElements(elements: DeclarativeCustomElement[]): void;
/**
 * Reference implementation of rendering a DeclarativeWindow object to a real DOM.
 * This is not part of the DeclarativeDOM spec itself—only a demonstration.
 */
export declare function renderWindow(desc: DeclarativeWindow): void;
declare global {
    interface Window {
        DDOM: {
            renderWindow: typeof renderWindow;
            buildElementTree: typeof buildElementTree;
            registerCustomElements: typeof registerCustomElements;
        };
    }
}
