import { describe, expect, it } from 'vitest';
import {
  getDomainFromEmail,
  isValidDomain,
  isValidPaydayDay,
  normalizeDomain
} from '../validation';

describe('validation utilities', () => {
  describe('normalizeDomain', () => {
    it('should lowercase and trim domain', () => {
      expect(normalizeDomain('  EXAMPLE.COM  ')).toBe('example.com');
    });
  });

  describe('isValidDomain', () => {
    it('should accept valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('subdomain.example.com')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('no dot')).toBe(false);
      expect(isValidDomain('nodot')).toBe(false);
      expect(isValidDomain('')).toBe(false);
    });
  });

  describe('isValidPaydayDay', () => {
    it('should accept days 1-28', () => {
      expect(isValidPaydayDay(1)).toBe(true);
      expect(isValidPaydayDay(15)).toBe(true);
      expect(isValidPaydayDay(28)).toBe(true);
    });

    it('should reject invalid days', () => {
      expect(isValidPaydayDay(0)).toBe(false);
      expect(isValidPaydayDay(29)).toBe(false);
      expect(isValidPaydayDay(-1)).toBe(false);
    });
  });

  describe('getDomainFromEmail', () => {
    it('should extract domain from email', () => {
      expect(getDomainFromEmail('user@example.com')).toBe('example.com');
      expect(getDomainFromEmail('admin@company.org')).toBe('company.org');
    });

    it('should return empty string for invalid email', () => {
      expect(getDomainFromEmail('notanemail')).toBe('');
      expect(getDomainFromEmail('')).toBe('');
    });
  });
});
