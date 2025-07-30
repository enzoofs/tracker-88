/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, '') // Basic XSS prevention
    .replace(/javascript:/gi, '') // Prevent javascript: URLs
    .replace(/data:/gi, ''); // Prevent data: URLs
};

/**
 * Validates and sanitizes search queries
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .slice(0, 100)
    .replace(/[<>'"&]/g, '')
    .replace(/[%_]/g, '\\$&'); // Escape SQL wildcards
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates date strings
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
};

/**
 * Safely parses JSON with validation
 */
export const safeJsonParse = <T = any>(jsonString: string): T | null => {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  try {
    const sanitized = jsonString.trim().slice(0, 10000); // Limit size
    const parsed = JSON.parse(sanitized);
    
    // Reject dangerous types
    if (typeof parsed === 'function' || parsed instanceof Date) {
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Validates user role
 */
export const isValidRole = (role: string): role is 'admin' | 'user' => {
  return ['admin', 'user'].includes(role);
};

/**
 * Sanitizes object properties recursively
 */
export const sanitizeObject = (obj: any, maxDepth: number = 3): any => {
  if (maxDepth <= 0) return null;
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeObject(item, maxDepth - 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).slice(0, 50).forEach(key => {
      const sanitizedKey = sanitizeInput(key, 50);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth - 1);
      }
    });
    return sanitized;
  }
  
  return null;
};