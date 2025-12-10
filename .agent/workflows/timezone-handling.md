---
description: How to handle timezones and datetimes correctly in the sheepyard-web application
---

# Timezone Handling Guide

This project uses **UTC storage** with **local display**. All datetime values are stored as UTC in the database and converted to local time for display.

## The Golden Rules

1. **Backend stores UTC**: All datetimes in the database are naive UTC
2. **API returns UTC with 'Z'**: Response schemas serialize datetimes with 'Z' suffix
3. **Frontend parses as UTC**: Use `parseUTCDate()` for API datetime strings
4. **Frontend sends UTC**: Use `Date.toISOString()` when sending to API

## ✅ Approved Patterns

### Frontend: Parsing API Datetimes

```typescript
// CORRECT: Use parseUTCDate for API datetime strings
import { parseUTCDate } from '../utils/dateUtils';

const eventStart = parseUTCDate(apiResponse.start_time);
```

### Frontend: Sending to API

```typescript
// CORRECT: toISOString() converts local to UTC with 'Z' suffix
const payload = {
  start_time: myDate.toISOString()
};
```

### Frontend: Getting Current Time

```typescript
// CORRECT: new Date() for current local time comparisons
if (parseUTCDate(event.end_time) > new Date()) { ... }
```

## ❌ Anti-Patterns

### Never Parse API Strings with new Date()

```typescript
// WRONG: new Date() interprets strings without 'Z' as LOCAL time
const eventStart = new Date(apiResponse.start_time);

// CORRECT: Use parseUTCDate
const eventStart = parseUTCDate(apiResponse.start_time);
```

### Never Use strftime for User-Facing Times in Backend

```typescript
// WRONG: Python strftime shows UTC time directly
time_display = event.start_time.strftime("%H:%M")

// CORRECT: Use Discord timestamp format for automatic local conversion
time_display = f"<t:{int(start_dt.timestamp())}:t>"
```

## How It Works

```
┌─────────────┐    toISOString()    ┌─────────────┐    stores as naive    ┌─────────────┐
│  Frontend   │ ─────────────────▶  │   Backend   │ ─────────────────────▶│   Database  │
│  (Local TZ) │                     │   (UTC)     │                       │   (UTC)     │
└─────────────┘                     └─────────────┘                       └─────────────┘
       ▲                                   │
       │                                   │
       │                                   ▼
       │           parseUTCDate()    ┌─────────────┐
       └─────────────────────────────│ API Response│ (datetime + 'Z' suffix)
                                     └─────────────┘
```

## Testing

When testing timezone handling:

1. Set your system to a non-UTC timezone (e.g., EST/UTC-5)
2. Create an event at a specific time (e.g., 3:00 PM)
3. Verify the event displays at 3:00 PM, not 8:00 PM (UTC)
4. Verify Discord embeds show local time using `<t:timestamp:f>` format
