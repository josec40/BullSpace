import { isAfter, startOfDay } from 'date-fns';

const isFutureDate = (date) => {
    const today = startOfDay(new Date());
    return isAfter(startOfDay(date), today) || startOfDay(date).getTime() === today.getTime();
};

export const validateBookingDate = (date) => {
    if (!isFutureDate(date)) {
        return 'Cannot make reservations in the past.';
    }
    return null;
};
