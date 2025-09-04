// src/hooks/useDateRange.js
import { useState, useEffect, useMemo } from "react";
import useLocalStorageState from "use-local-storage-state";

const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = `0${d.getMonth() + 1}`.slice(-2);
    const day = `0${d.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
};

export const useDateRange = (initialRange = "3-Months") => {
    const initialDates = useMemo(() => {
        const today = new Date();
        const start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        return {
            startDate: formatDateForInput(start),
            endDate: formatDateForInput(today),
        };
    }, []);

    const [dates, setDates] = useState(initialDates);
    const [dateRangeType, setDateRangeType] = useLocalStorageState('dateType', initialRange);

    useEffect(() => {
        const today = new Date();
        let start, end;
        switch (dateRangeType) {
            case "thisWeek":
                start = new Date(today);
                start.setDate(today.getDate() - today.getDay());
                end = new Date(today);
                break;
            // ... other cases from original component
            case "lastWeek":
                start = new Date(today);
                start.setDate(today.getDate() - today.getDay() - 7);
                end = new Date(today);
                end.setDate(today.getDate() - today.getDay() - 1);
                break;
            case "thisMonth":
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today);
                break;
            case "lastMonth":
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case "thisYear":
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today);
                break;
            case "lastYear":
                start = new Date(today.getFullYear() - 1, 0, 1);
                end = new Date(today.getFullYear() - 1, 11, 31);
                break;
            case "custom":
                return; // Do nothing, manual date entry
            default: // "3-Months"
                start = new Date(today);
                start.setMonth(today.getMonth() - 3);
                end = new Date(today);
        }
        setDates({
            startDate: formatDateForInput(start),
            endDate: formatDateForInput(end),
        });
    }, [dateRangeType]);

    const handleDateChange = (e) => {
        setDates((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setDateRangeType("custom");
    };

    const resetDates = () => {
        setDateRangeType(initialRange);
    }

    return { dates, dateRangeType, setDateRangeType, handleDateChange, resetDates };
};