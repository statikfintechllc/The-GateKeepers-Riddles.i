#!/bin/bash
# Database Initialization Script
# Creates and initializes the repository database with proper schema

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="${SCRIPT_DIR}/../.."
SCHEMA_DIR="${SCRIPT_DIR}/../schema"
DB_FILE="${DB_DIR}/repo.db"
BACKUP_DIR="${SCRIPT_DIR}/../backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Repository Database Initialization${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 command not found. Please install SQLite3.${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup existing database if it exists
if [ -f "$DB_FILE" ]; then
    BACKUP_FILE="${BACKUP_DIR}/repo_backup_$(date +%Y%m%d_%H%M%S).db"
    echo -e "${YELLOW}Backing up existing database to: $BACKUP_FILE${NC}"
    cp "$DB_FILE" "$BACKUP_FILE"
fi

# Create/recreate the database
echo -e "${GREEN}Creating database at: $DB_FILE${NC}"
rm -f "$DB_FILE"

# Initialize with core schema
echo -e "${GREEN}Applying core schema...${NC}"
sqlite3 "$DB_FILE" < "${SCHEMA_DIR}/core.sql"

# Set database pragmas for performance
echo -e "${GREEN}Configuring database settings...${NC}"
sqlite3 "$DB_FILE" <<EOF
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000000;
PRAGMA page_size = 4096;
PRAGMA foreign_keys = ON;
EOF

# Verify schema
echo -e "${GREEN}Verifying database schema...${NC}"
TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
VIEW_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='view';")
INDEX_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='index';")
TRIGGER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger';")

echo -e "  Tables:   ${GREEN}${TABLE_COUNT}${NC}"
echo -e "  Views:    ${GREEN}${VIEW_COUNT}${NC}"
echo -e "  Indexes:  ${GREEN}${INDEX_COUNT}${NC}"
echo -e "  Triggers: ${GREEN}${TRIGGER_COUNT}${NC}"
echo ""

# Initialize with default data
echo -e "${GREEN}Initializing default data...${NC}"
sqlite3 "$DB_FILE" <<EOF
-- Insert default component types
INSERT OR IGNORE INTO components (name, type, description) VALUES
    ('UI Components', 'ui', 'User interface components including HTML, CSS, and visual elements'),
    ('Business Logic', 'logic', 'Core application logic and processing'),
    ('Data Layer', 'data', 'Data structures, models, and riddle content'),
    ('Infrastructure', 'infrastructure', 'Build tools, workflows, and configuration'),
    ('Documentation', 'documentation', 'README files, guides, and documentation'),
    ('Testing', 'test', 'Test files and testing infrastructure'),
    ('Configuration', 'config', 'Configuration files and settings');

-- Insert common tags
INSERT OR IGNORE INTO tags (name, category) VALUES
    ('javascript', 'language'),
    ('html', 'language'),
    ('css', 'language'),
    ('markdown', 'language'),
    ('json', 'language'),
    ('yaml', 'language'),
    ('frontend', 'category'),
    ('backend', 'category'),
    ('api', 'category'),
    ('pwa', 'feature'),
    ('riddle', 'content'),
    ('automation', 'feature'),
    ('security', 'feature'),
    ('performance', 'optimization');
EOF

# Get database size
DB_SIZE=$(du -h "$DB_FILE" | cut -f1)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database initialized successfully!${NC}"
echo -e "Database file: ${GREEN}$DB_FILE${NC}"
echo -e "Database size: ${GREEN}$DB_SIZE${NC}"
echo -e "${GREEN}========================================${NC}"
