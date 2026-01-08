/**
 * Helper Utilities
 * General-purpose helper functions
 */

/**
 * Generate a UUID v4
 * @returns {string} - UUID string
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get nested property from object using dot notation
 * @param {object} obj - Object to query
 * @param {string} path - Dot-notation path (e.g., "character.hp.current")
 * @returns {any} - Value at path, or undefined
 */
export function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) =>
        current?.[prop], obj
    );
}

/**
 * Set nested property on object using dot notation
 * @param {object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {any} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, prop) => {
        if (!current || typeof current !== 'object') return null;
        if (!(prop in current)) current[prop] = {};
        return current[prop];
    }, obj);

    // Don't try to set property on null/undefined target
    if (target && typeof target === 'object') {
        target[last] = value;
    }
}

/**
 * Deep clone an object (simple version, no functions/dates)
 * @param {object} obj - Object to clone
 * @returns {object} - Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Calculate distance between two points (Manhattan distance)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Manhattan distance
 */
export function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Calculate distance between two points (Euclidean distance)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Euclidean distance
 */
export function euclideanDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Format number with sign (+/-)
 * @param {number} num - Number to format
 * @returns {string} - Formatted string (e.g., "+3", "-2")
 */
export function formatModifier(num) {
    return num >= 0 ? `+${num}` : `${num}`;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to Title Case
 * @param {string} str - camelCase string
 * @returns {string} - Title Case string
 */
export function camelToTitle(str) {
    if (!str) return '';
    const result = str.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Debounce function calls
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {function} func - Function to throttle
 * @param {number} limit - Limit in ms
 * @returns {function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Get random element from array
 * @param {array} array - Array to select from
 * @returns {any} - Random element
 */
export function randomChoice(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 * @param {array} array - Array to shuffle
 * @returns {array} - Shuffled array (new array)
 */
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Group array by key
 * @param {array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {object} - Grouped object
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Sort array of objects by key
 * @param {array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {boolean} ascending - Sort ascending (default true)
 * @returns {array} - Sorted array
 */
export function sortBy(array, key, ascending = true) {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

/**
 * Format time duration (milliseconds to human readable)
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format date to readable string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Wait for specified time (async)
 * @param {number} ms - Time to wait in milliseconds
 * @returns {Promise} - Promise that resolves after wait time
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if point is in rectangle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} rectX - Rectangle X
 * @param {number} rectY - Rectangle Y
 * @param {number} rectWidth - Rectangle width
 * @param {number} rectHeight - Rectangle height
 * @returns {boolean} - True if point is in rectangle
 */
export function pointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
    return x >= rectX && x < rectX + rectWidth &&
           y >= rectY && y < rectY + rectHeight;
}

/**
 * Simple event emitter class
 */
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }

    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

/**
 * Simple logger with levels
 */
export class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.enabled = true;
    }

    log(...args) {
        if (this.enabled) {
            console.log(`[${this.context}]`, ...args);
        }
    }

    info(...args) {
        if (this.enabled) {
            console.info(`[${this.context}] ℹ️`, ...args);
        }
    }

    warn(...args) {
        if (this.enabled) {
            console.warn(`[${this.context}] ⚠️`, ...args);
        }
    }

    error(...args) {
        if (this.enabled) {
            console.error(`[${this.context}] ❌`, ...args);
        }
    }

    debug(...args) {
        if (this.enabled && process.env.NODE_ENV === 'development') {
            console.debug(`[${this.context}] 🐛`, ...args);
        }
    }
}

/**
 * Performance timer utility
 */
export class Timer {
    constructor() {
        this.startTime = null;
    }

    start() {
        this.startTime = performance.now();
    }

    end(label = 'Operation') {
        if (!this.startTime) {
            console.warn('Timer not started');
            return 0;
        }
        const duration = performance.now() - this.startTime;
        console.log(`${label} took ${duration.toFixed(2)}ms`);
        this.startTime = null;
        return duration;
    }
}
