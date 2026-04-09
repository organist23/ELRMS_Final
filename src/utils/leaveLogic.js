// src/utils/leaveLogic.js

export const LEAVE_DEFAULTS = {
  vacationLeave: 0,
  sickLeave: 0,
  specialLeave: 3,
  forceLeave: 5,
  wellnessLeave: 5,
  soloParentLeave: 7
};

export const PRIVILEGE_LIMITS = {
  specialLeave: 3,
  forceLeave: 5,
  wellnessLeave: 5,
  soloParentLeave: 7
};

/**
 * Validates if the requested days exceed the privilege limit.
 * @param {string} type 
 * @param {number} days 
 * @returns {boolean}
 */
export const isWithinPrivilegeLimit = (type, days) => {
  if (!PRIVILEGE_LIMITS[type]) return true; // Earned leaves don't have privilege caps
  return days <= PRIVILEGE_LIMITS[type];
};

/**
 * Formats a number to 3 decimal places as per requirements.
 * @param {number} num 
 * @returns {string}
 */
export const formatCredits = (num) => {
  return parseFloat(num).toFixed(3);
};

/**
 * Calculates new balance after deduction.
 * @param {number} current 
 * @param {number} deduction 
 * @returns {number}
 */
export const calculateDeduction = (current, deduction) => {
  return Math.max(0, current - deduction);
};

/**
 * Calculates monthly increment for Earned leaves.
 * @param {number} current 
 * @returns {number}
 */
export const addMonthlyCredits = (current) => {
  return current + 1.25;
};
