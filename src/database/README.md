# Create database

createdb -U revest ai_platform

# Run migrations

npm run migrate

# Backup

pg_dump -U revest -Fc ai_platform > src/database/backups/latest.dump

# Restore

createdb -U revest ai_platform
pg_restore -U revest -d ai_platform src/database/backups/latest.dump
