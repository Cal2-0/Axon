/**
 * Indian number formatting utilities for AXON
 * Formats numbers in Indian system: crores, lakhs, thousands
 * e.g. 27932548.01 → "2,79,32,548.01"
 */

/**
 * Format a number in Indian locale with ₹ prefix.
 * @param {number|string} value - The number to format
 * @param {number} decimals - Decimal places (default 2)
 * @returns {string} e.g. "₹2,79,32,548.01"
 */
export function formatINR(value, decimals = 2) {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number in Indian locale without currency prefix.
 * @param {number|string} value
 * @param {number} decimals
 * @returns {string} e.g. "2,79,32,548.01"
 */
export function formatIndian(value, decimals = 2) {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Short label for large INR values (crores/lakhs).
 * e.g. 27932548 → "₹2.79 Cr"
 * @param {number|string} value
 * @returns {string}
 */
export function formatINRShort(value) {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return '₹0';
  if (num >= 1e7) return `₹${(num / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (num >= 1e5) return `₹${(num / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  if (num >= 1e3) return `₹${(num / 1e3).toLocaleString('en-IN', { maximumFractionDigits: 2 })} K`;
  return formatINR(num);
}
