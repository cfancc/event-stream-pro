/**
 * Decodes a string containing Unicode escape sequences (e.g., "\\u6D4B\\u8BD5") back to characters.
 * Also handles standard JSON unescaping.
 * @param {string} str 
 * @returns {string}
 */
export function decodeUnicode(str) {
    if (!str) return str;

    // First, try basic JSON.parse if the string looks like a JSON string
    // This is the safest way to handle standard escapes including \u
    try {
        // If it's already a valid JSON string (e.g. "\"\\u4F60\\u597D\""), parsing it works great.
        // But often we have a raw string segment like "Status: \u4F60\u597D".
        // A simple regex replacement is often more robust for partial strings avoiding JSON errors.

        return str.replace(/\\u([\dA-F]{4})/gi, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        });
    } catch (e) {
        console.error("Decode failed", e);
        return str;
    }
}

/**
 * Tries to parse a JSON string and decode unicode values within it recursively.
 * @param {string} str 
 * @returns {object|string}
 */
export function safeJsonParseAndDecode(str) {
    try {
        // First parse raw JSON
        const obj = JSON.parse(str);

        // Helper to recursively decode strings in object
        const traverse = (o) => {
            if (typeof o === 'string') {
                return decodeUnicode(o);
            }
            if (Array.isArray(o)) {
                return o.map(traverse);
            }
            if (o && typeof o === 'object') {
                for (const key in o) {
                    o[key] = traverse(o[key]);
                }
                return o;
            }
            return o;
        };

        return traverse(obj);
    } catch (e) {
        // Not JSON, just decode string
        return decodeUnicode(str);
    }
}
