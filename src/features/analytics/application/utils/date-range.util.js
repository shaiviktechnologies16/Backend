/**
 * Standard Date Range Parser for Analytics queries.
 * Computes aligned 'from' and 'to' boundaries and the preceding equivalent baseline window.
 */

export function parseDateRange({
  from: queryFrom,
  to: queryTo,
  period = "7d",
  timezone = "UTC",
}) {
  const now = new Date();

  let fromDate;
  let toDate = new Date(now);

  if (queryFrom && queryTo) {
    fromDate = new Date(queryFrom);
    toDate = new Date(queryTo);
  } else {
    switch (period) {
      case "today": {
        fromDate = new Date(now);
        fromDate.setHours(0, 0, 0, 0);
        break;
      }
      case "yesterday": {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);

        toDate = new Date(now);
        toDate.setDate(toDate.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      }
      case "30d": {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 30);
        break;
      }
      case "90d": {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 90);
        break;
      }
      case "7d":
      default: {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      }
    }
  }

  // Safety fallback if invalid dates were provided
  if (isNaN(fromDate.getTime())) {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
  }
  if (isNaN(toDate.getTime())) {
    toDate = new Date(now);
  }

  // Calculate prior period window of identical duration for comparisons
  const durationMs = toDate.getTime() - fromDate.getTime();
  const priorToDate = new Date(fromDate.getTime());
  const priorFromDate = new Date(fromDate.getTime() - durationMs);

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    priorFrom: priorFromDate.toISOString(),
    priorTo: priorToDate.toISOString(),
    timezone: timezone || "UTC",
  };
}

