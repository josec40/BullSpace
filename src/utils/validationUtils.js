import { isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';

const SEMESTER_START = parseISO('2025-08-25');
const SEMESTER_END = parseISO('2025-12-05');

export const isDateInSemester = (date) => {
    const d = startOfDay(date);
    return (isAfter(d, startOfDay(SEMESTER_START)) || d.getTime() === startOfDay(SEMESTER_START).getTime()) &&
        (isBefore(d, endOfDay(SEMESTER_END)) || d.getTime() === startOfDay(SEMESTER_END).getTime());
};

export const isFutureDate = (date) => {
    const today = startOfDay(new Date());
    return isAfter(startOfDay(date), today) || startOfDay(date).getTime() === today.getTime();
};

export const validateBookingDate = (date) => {
    if (!isDateInSemester(date)) {
        return 'Bookings are only allowed between Aug 25 and Dec 5.';
    }
    if (!isFutureDate(date)) {
        return 'Cannot make reservations in the past.';
    }
    return null;
};
