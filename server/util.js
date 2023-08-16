// @param unit: "milliseconds", "seconds", "minutes", "hours", "days", "weeks", "months", "years"
exports.tq_to_ms = function tq_to_ms(unit, value) {
    switch (unit) {
        case "milliseconds":
            return value;
        case "seconds":
            return value * 1000;
        case "minutes":
            return tq_to_ms("seconds", value) * 60;
        case "hours":
            return tq_to_ms("minutes", value) * 60;
        case "days":
            return tq_to_ms("hours", value) * 24;
        case "weeks":
            return tq_to_ms("days", value) * 7;
        case "months":
            return tq_to_ms("days", value) * 30;
        case "years":
            return tq_to_ms("days", value) * 365;
    }
}