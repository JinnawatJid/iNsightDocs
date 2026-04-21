# TODOs and Future Improvements

## Feature Flags Management
Currently, the `ENABLE_BATCH_DURATION_LOGGING` feature flag is managed via the backend `.env` file and exposed to the frontend via the `/api/config/features` endpoint.

**Future Migration (Option A):**
In the future, this setting should be migrated to the `Configurations` database table to allow for dynamic updates via the System Configuration UI without requiring backend server restarts.
