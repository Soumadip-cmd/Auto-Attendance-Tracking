const moment = require('moment-timezone');

class DateUtils {
  /**
   * Get start and end of day
   */
  getStartOfDay(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  getEndOfDay(date = new Date()) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  /**
   * Get start and end of week
   */
  getStartOfWeek(date = new Date()) {
    return moment(date).startOf('week').toDate();
  }

  getEndOfWeek(date = new Date()) {
    return moment(date).endOf('week').toDate();
  }

  /**
   * Get start and end of month
   */
  getStartOfMonth(date = new Date()) {
    return moment(date).startOf('month').toDate();
  }

  getEndOfMonth(date = new Date()) {
    return moment(date).endOf('month').toDate();
  }

  /**
   * Get start and end of year
   */
  getStartOfYear(date = new Date()) {
    return moment(date).startOf('year').toDate();
  }

  getEndOfYear(date = new Date()) {
    return moment(date).endOf('year').toDate();
  }

  /**
   * Format date to string
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    return moment(date).format(format);
  }

  /**
   * Format date with time
   */
  formatDateTime(date, format = 'YYYY-MM-DD HH:mm: ss') {
    return moment(date).format(format);
  }

  /**
   * Format time only
   */
  formatTime(date, format = 'HH:mm: ss') {
    return moment(date).format(format);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(date) {
    return moment(date).fromNow();
  }

  /**
   * Get time difference in minutes
   */
  getDifferenceInMinutes(startDate, endDate) {
    return moment(endDate).diff(moment(startDate), 'minutes');
  }

  /**
   * Get time difference in hours
   */
  getDifferenceInHours(startDate, endDate) {
    return moment(endDate).diff(moment(startDate), 'hours', true);
  }

  /**
   * Get time difference in days
   */
  getDifferenceInDays(startDate, endDate) {
    return moment(endDate).diff(moment(startDate), 'days');
  }

  /**
   * Add days to date
   */
  addDays(date, days) {
    return moment(date).add(days, 'days').toDate();
  }

  /**
   * Subtract days from date
   */
  subtractDays(date, days) {
    return moment(date).subtract(days, 'days').toDate();
  }

  /**
   * Add hours to date
   */
  addHours(date, hours) {
    return moment(date).add(hours, 'hours').toDate();
  }

  /**
   * Check if date is today
   */
  isToday(date) {
    return moment(date).isSame(moment(), 'day');
  }

  /**
   * Check if date is in the past
   */
  isPast(date) {
    return moment(date).isBefore(moment());
  }

  /**
   * Check if date is in the future
   */
  isFuture(date) {
    return moment(date).isAfter(moment());
  }

  /**
   * Check if date is between two dates
   */
  isBetween(date, startDate, endDate) {
    return moment(date).isBetween(moment(startDate), moment(endDate));
  }

  /**
   * Get day of week (0 = Sunday, 6 = Saturday)
   */
  getDayOfWeek(date) {
    return moment(date).day();
  }

  /**
   * Get day name (e.g., "Monday")
   */
  getDayName(date) {
    return moment(date).format('dddd');
  }

  /**
   * Get month name (e.g., "January")
   */
  getMonthName(date) {
    return moment(date).format('MMMM');
  }

  /**
   * Check if date is weekend
   */
  isWeekend(date) {
    const day = this.getDayOfWeek(date);
    return day === 0 || day === 6;
  }

  /**
   * Check if date is weekday
   */
  isWeekday(date) {
    return ! this.isWeekend(date);
  }

  /**
   * Get working days between two dates
   */
  getWorkingDaysBetween(startDate, endDate) {
    let count = 0;
    let current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      if (this.isWeekday(current. toDate())) {
        count++;
      }
      current. add(1, 'day');
    }

    return count;
  }

  /**
   * Get date range array
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    let current = moment(startDate);
    const end = moment(endDate);

    while (current. isSameOrBefore(end)) {
      dates.push(current.toDate());
      current.add(1, 'day');
    }

    return dates;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateString) {
    return moment(dateString).toDate();
  }

  /**
   * Check if valid date
   */
  isValidDate(date) {
    return moment(date).isValid();
  }

  /**
   * Convert to timezone
   */
  convertToTimezone(date, timezone = 'America/New_York') {
    return moment(date).tz(timezone).toDate();
  }

  /**
   * Get current timestamp
   */
  getCurrentTimestamp() {
    return moment().valueOf();
  }

  /**
   * Get ISO string
   */
  toISOString(date) {
    return moment(date).toISOString();
  }

  /**
   * Calculate age from birthdate
   */
  calculateAge(birthdate) {
    return moment().diff(moment(birthdate), 'years');
  }

  /**
   * Get quarter of year (1-4)
   */
  getQuarter(date) {
    return moment(date).quarter();
  }

  /**
   * Get week number of year
   */
  getWeekNumber(date) {
    return moment(date).week();
  }

  /**
   * Format duration from minutes
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format duration in hours (decimal)
   */
  formatDurationInHours(minutes) {
    return (minutes / 60).toFixed(2);
  }

  /**
   * Get time from now in human readable format
   */
  getTimeFromNow(date) {
    const diff = moment().diff(moment(date), 'seconds');
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    
    return moment(date).format('MMMM DD, YYYY');
  }

  /**
   * Check if time is within range
   */
  isTimeInRange(time, startTime, endTime) {
    const current = moment(time, 'HH:mm');
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');

    if (end.isBefore(start)) {
      // Range crosses midnight
      return current.isAfter(start) || current.isBefore(end);
    }

    return current.isBetween(start, end, null, '[]');
  }

  /**
   * Get business hours status
   */
  isWithinBusinessHours(date, startHour = 9, endHour = 18) {
    const hour = moment(date).hour();
    return hour >= startHour && hour < endHour && this.isWeekday(date);
  }

  /**
   * Round time to nearest interval
   */
  roundToNearestInterval(date, intervalMinutes = 15) {
    const roundedMinutes = Math.round(moment(date).minute() / intervalMinutes) * intervalMinutes;
    return moment(date).minute(roundedMinutes).second(0).millisecond(0).toDate();
  }
}

module.exports = new DateUtils();