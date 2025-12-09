from datetime import datetime, timedelta, timezone
import pytest
from pydantic import ValidationError
from schemas import PollOptionCreate

def test_start_time_future():
    # Future time
    future = datetime.now(timezone.utc) + timedelta(hours=1)

    # This should pass (assuming end time is after start time)
    end = future + timedelta(hours=1)

    # Note: PollOptionCreate inherits validation from PollOptionBase (end > start)
    # and has its own (start > now).

    # Pydantic models might require all fields.
    # We need to simulate values.

    try:
        PollOptionCreate(label="test", start_time=future, end_time=end)
        print("Future validation passed")
    except ValidationError as e:
        print(f"Future validation failed unexpectedly: {e}")

    # Past time
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    past_end = past + timedelta(hours=1)

    try:
        PollOptionCreate(label="test", start_time=past, end_time=past_end)
        print("Past validation FAILED (Should have raised error)")
    except ValidationError as e:
        print("Past validation passed (Raised expected error)")

if __name__ == "__main__":
    test_start_time_future()
