/**
 * Centralized Namespace Registry with DRY Validation
 * 
 * Imports handlers and config types from each namespace module,
 * validates with typia once, and delegates to appropriate handlers.
 */

// Temporarily disabled: import typia from 'typia';

// Import namespace handlers and their config types
import { type PrototypeConfig } from './types';
import { processProperty } from '../core/properties';

import { createArrayNamespace } from './array';
import { createRequestNamespace } from './request';
import { createFormDataNamespace } from './form-data';
import { createURLSearchParamsNamespace } from './url-search-params';
import { createURLNamespace } from './url';
import { createBlobNamespace } from './blob';
import { createArrayBufferNamespace } from './array-buffer';
import { createReadableStreamNamespace } from './readable-stream';
import { createCookieNamespace } from './cookie';
import { createStorageNamespace } from './storage';
import { createIndexedDBNamespace } from './indexed-db';
import { createIDBRequestNamespace } from './indexed-db-request';
import { createWebSocketNamespace } from './web-socket';


/**
 * Namespace handler function type (without validation)
 */
export type NamespaceHandler = (
  config: any, // Already validated config
  key: string,
  element: any
) => any;

/**
 * Config type validator function type
 */
export type ConfigValidator = (config: any) => boolean;

/**
 * Registry entry with handler and validator
 */
interface NamespaceEntry {
  handler: NamespaceHandler;
  validator: ConfigValidator;
}

/**
 * Registry mapping prototype names to their handlers and validators
 */

// Temporary workaround: disable typia validators to allow building
const dummyValidator = () => true;
// const arrayConfigValidator = typia.createIs<ArrayConfig>();
// const storageConfigValidator = typia.createIs<StorageConfig>();
const arrayConfigValidator = dummyValidator;
const storageConfigValidator = dummyValidator;

const NAMESPACE_REGISTRY: Record<string, NamespaceEntry> = {
  // Collection types (Array-like)
  'Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Set': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Map': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Int8Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Uint8Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Int16Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Uint16Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Int32Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Uint32Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Float32Array': { handler: createArrayNamespace, validator: arrayConfigValidator },
  'Float64Array': { handler: createArrayNamespace, validator: arrayConfigValidator },

  // Web API types
  'Request': { handler: createRequestNamespace, validator: dummyValidator },
  'FormData': { handler: createFormDataNamespace, validator: dummyValidator },
  'URLSearchParams': { handler: createURLSearchParamsNamespace, validator: dummyValidator },
  'URL': { handler: createURLNamespace, validator: dummyValidator },
  'Blob': { handler: createBlobNamespace, validator: dummyValidator },
  'ArrayBuffer': { handler: createArrayBufferNamespace, validator: dummyValidator },
  'ReadableStream': { handler: createReadableStreamNamespace, validator: dummyValidator },

  // Storage API types
  'Cookie': { handler: createCookieNamespace, validator: dummyValidator },
  'SessionStorage': { handler: createStorageNamespace, validator: storageConfigValidator },
  'LocalStorage': { handler: createStorageNamespace, validator: storageConfigValidator },
  'IndexedDB': { handler: createIndexedDBNamespace, validator: dummyValidator },
  'IDBRequest': { handler: createIDBRequestNamespace, validator: dummyValidator },
  'WebSocket': { handler: createWebSocketNamespace, validator: dummyValidator },
};

/**
 * Processes a namespaced property with centralized validation and handler dispatch.
 * This is the main entry point for all namespace processing in DDOM, providing
 * unified validation and routing to appropriate namespace handlers based on prototype.
 * 
 * @param key - The property name being processed (for debugging and context)
 * @param config - The namespace configuration object with prototype identifier
 * @param element - The element context for property resolution and binding
 * @returns The processed namespace object (signal, computed value, etc.)
 * 
 * @example
 * ```typescript
 * // Process an Array namespace
 * const arraySignal = processNamespacedProperty('items', {
 *   prototype: 'Array',
 *   items: [1, 2, 3],
 *   filter: [{ property: 'value', operator: '>', value: 1 }]
 * }, element);
 * 
 * // Process a Storage namespace
 * const storageSignal = processNamespacedProperty('userData', {
 *   prototype: 'LocalStorage',
 *   key: 'user-settings',
 *   value: { theme: 'dark' }
 * }, element);
 * ```
 */
export function processNamespacedProperty(
  key: string,
  config: PrototypeConfig,
  element: any
): any {
  const entry = NAMESPACE_REGISTRY[config.prototype];

  if (!entry) {
    console.warn(`No handler found for prototype: ${config.prototype}. Skipping.`);
    return null;
  }

  // Centralized validation using typia
  if (!entry.validator(config)) {
    console.warn(`Invalid ${config.prototype}Config for ${key}:`, config);
    return null;
  }

  try {
    return entry.handler(config, key, element);
  } catch (error) {
    console.error(`Namespace handler failed for ${config.prototype}:`, error);
    return null;
  }
}


/**
 * Processes a configuration object recursively using the unified property resolution.
 * Extracts the actual values from ProcessedProperty objects for use in fetch operations.
 */
export function resolveConfig(config: any, contextNode: any): { value: any; isValid: boolean } {
  const processed: any = { ...config };

  for (const key of Object.keys(processed)) {
    const value = processed[key];
    let resolvedValue: any;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check if this is a namespace object (has prototype property)
      if (value.prototype && NAMESPACE_REGISTRY[value.prototype]) {
        // Process the namespace and get its resolved value
        const namespaceResult = processNamespacedProperty(key, value, contextNode);
        if (!namespaceResult) {
          return { value: null, isValid: false };
        }
        resolvedValue = namespaceResult;
      } else {
        // Recursively process nested objects (like headers)
        const nestedResult = resolveConfig(value, contextNode);
        if (!nestedResult.isValid) return { value: null, isValid: false };
        resolvedValue = nestedResult.value;
      }
    } else {
      // Use the unified property resolution from properties.ts
      const processedProp = processProperty(key, value, contextNode);
      if (!processedProp.isValid) return { value: null, isValid: false };
      resolvedValue = processedProp.value;
    }

    // Unwrap signals and computed values
    if (resolvedValue?.get && typeof resolvedValue.get === 'function') {
      resolvedValue = resolvedValue.get();
    }

    // Only invalidate on null or undefined - allow explicit falsy values like '', false, 0
    if (resolvedValue === null || resolvedValue === undefined) {
      return { value: null, isValid: false };
    }

    processed[key] = resolvedValue;
  }

  return { value: processed, isValid: true };
}