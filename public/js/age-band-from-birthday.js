/**
 * Derive starter-plan age_band from ISO birthday (YYYY-MM-DD).
 */
(function () {
  'use strict';

  function ageBandFromBirthday(birthday) {
    if (!birthday || typeof birthday !== 'string') return '6-8';
    const dateOnly = birthday.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return '6-8';
    const birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(birthDate.getTime())) return '6-8';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age <= 5) return '3-5';
    if (age <= 8) return '6-8';
    if (age <= 12) return '9-12';
    return '13+';
  }

  window.ageBandFromBirthday = ageBandFromBirthday;
})();
