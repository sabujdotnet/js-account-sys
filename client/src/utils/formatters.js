/**
 * Formatters Utility
 */

/**
 * Format currency with BDT symbol
 */
export function formatCurrency(amount, currency = 'BDT') {
  if (amount === null || amount === undefined) return '৳ 0';
  
  const symbols = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
  };
  
  const symbol = symbols[currency] || '৳';
  
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(currency, symbol);
}

/**
 * Format date
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '-';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return date.toLocaleDateString('en-BD', { ...defaultOptions, ...options });
}

/**
 * Format datetime
 */
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format number
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('bn-BD').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role) {
  const roles = {
    director: 'Director',
    manager: 'Manager',
    engineer: 'Engineer',
  };
  return roles[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role) {
  const colors = {
    director: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    engineer: 'bg-emerald-100 text-emerald-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status) {
  const colors = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-emerald-100 text-emerald-800',
    overdue: 'bg-red-100 text-red-800',
    planning: 'bg-purple-100 text-purple-800',
    on_hold: 'bg-amber-100 text-amber-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
