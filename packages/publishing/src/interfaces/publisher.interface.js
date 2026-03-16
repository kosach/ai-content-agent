"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherError = exports.PublisherErrorType = void 0;
/**
 * Publisher Error Types
 *
 * Standardized error categories for better handling
 */
var PublisherErrorType;
(function (PublisherErrorType) {
    // Auth errors
    PublisherErrorType["AUTH_INVALID"] = "AUTH_INVALID";
    PublisherErrorType["AUTH_EXPIRED"] = "AUTH_EXPIRED";
    PublisherErrorType["AUTH_INSUFFICIENT"] = "AUTH_INSUFFICIENT";
    // Quota/Rate limit errors
    PublisherErrorType["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    PublisherErrorType["RATE_LIMITED"] = "RATE_LIMITED";
    // Validation errors
    PublisherErrorType["INVALID_VIDEO"] = "INVALID_VIDEO";
    PublisherErrorType["INVALID_METADATA"] = "INVALID_METADATA";
    // Platform errors
    PublisherErrorType["PLATFORM_ERROR"] = "PLATFORM_ERROR";
    PublisherErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Unknown
    PublisherErrorType["UNKNOWN"] = "UNKNOWN";
})(PublisherErrorType || (exports.PublisherErrorType = PublisherErrorType = {}));
/**
 * Publisher Error
 *
 * Thrown by publishers with categorized error type
 */
class PublisherError extends Error {
    type;
    retryable;
    retryAfter;
    constructor(type, message, retryable = false, retryAfter) {
        super(message);
        this.type = type;
        this.retryable = retryable;
        this.retryAfter = retryAfter;
        this.name = 'PublisherError';
    }
}
exports.PublisherError = PublisherError;
//# sourceMappingURL=publisher.interface.js.map