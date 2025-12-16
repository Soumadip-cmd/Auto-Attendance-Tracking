const dateUtils = require('../../../src/utils/dateUtils');
const moment = require('moment');

describe('DateUtils', () => {
  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = dateUtils.getStartOfDay(date);

      expect(result. getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = dateUtils. getEndOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('getDifferenceInMinutes', () => {
    it('should calculate difference in minutes', () => {
      const start = new Date('2024-01-15T09:00:00');
      const end = new Date('2024-01-15T09:30:00');
      
      const diff = dateUtils.getDifferenceInMinutes(start, end);
      
      expect(diff).toBe(30);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2024-01-13'); // Saturday
      expect(dateUtils.isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2024-01-14'); // Sunday
      expect(dateUtils. isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date('2024-01-15'); // Monday
      expect(dateUtils.isWeekend(monday)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = dateUtils.formatDate(date, 'YYYY-MM-DD');
      
      expect(formatted).toBe('2024-01-15');
    });
  });
});