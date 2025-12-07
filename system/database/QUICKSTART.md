# Quick Start Guide

## Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd system/database
npm install
```

### 2. Initialize Database
```bash
npm run init
```

This creates a new SQLite database at `system/database/repo.db` with the complete schema.

### 3. Migrate Existing Data (Optional)
```bash
npm run migrate
```

This imports data from the legacy JSON files into the database.

## Verify Installation

```bash
# Check database statistics
npm run stats

# List files
./cli/repo-db.js files --limit 10

# Search for something
./cli/repo-db.js search "riddle"
```

## What You Get

✅ **State-of-the-art SQLite database** with 20 tables (18 regular + 2 FTS5 virtual tables)  
✅ **6 optimized views** for common queries  
✅ **Full-text search** across files and functions  
✅ **Relational data model** with foreign keys and constraints  
✅ **ACID transactions** for data integrity  
✅ **Comprehensive indexing** for fast queries  
✅ **CLI tools** for database management  
✅ **JavaScript API** for programmatic access  
✅ **Backup & restore** capabilities  
✅ **Migration tools** from JSON to database  

## Database Location

The database file is created at:
```
system/database/repo.db
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the [CLI commands](README.md#command-line-interface)
- Check out the [JavaScript API](README.md#javascript-api)
- Review the [schema documentation](README.md#database-schema-details)

## Common Commands

```bash
# Show statistics
npm run stats

# List files
./cli/repo-db.js files

# List functions
./cli/repo-db.js functions

# Search
./cli/repo-db.js search "your-search-term"

# Dependencies
./cli/repo-db.js deps

# Complexity report
./cli/repo-db.js complexity

# Backup
npm run backup

# Export to JSON
./cli/repo-db.js export > data.json
```

## Troubleshooting

**Problem**: `sqlite3` module not found  
**Solution**: Run `npm install` in the `system/database` directory

**Problem**: Permission denied on scripts  
**Solution**: Run `chmod +x lib/init_db.sh cli/repo-db.js`

**Problem**: Database already exists  
**Solution**: The init script automatically backs up existing databases

## Support

For issues or questions:
- Check the [README.md](README.md) documentation
- Review the database [schema](schema/core.sql)
- Examine the [API code](lib/database.js)

---

**🎉 You now have a state-of-the-art database system!**
