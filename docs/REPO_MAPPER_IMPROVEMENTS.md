# Repo-Mapper Agent System Improvements

## Date: December 7, 2025

## Overview

This document provides a comprehensive analysis and recommendations for improving the repo-mapper agent system to properly integrate with the SQLite database system and follow the established issue-based workflow pattern.

---

## Current Problems Identified

### 1. **Hardcoded Script Instead of AI-Based Agent**
- The workflow file (`repo-mapper-agent.yml`) contains a 288-line hardcoded Node.js script
- Uses simple regex patterns for code parsing (lines 130-158)
- Not AI-driven - it's a static script that doesn't understand code contextually
- Agent instructions in `.github/agents/repo-mapper.agent.md` are ignored by the workflow

### 2. **No Database Integration**
- The script doesn't use the comprehensive SQLite database system in `system/database/`
- Database API (`lib/database.js`) with 20+ methods is completely unused
- Only generates JSON files, missing the power of relational database
- No scan history tracking
- No full-text search capabilities utilized

### 3. **Wrong Workflow Pattern**
- Current: Triggered by schedule/push → runs script → commits directly
- Should be: Issue created → Copilot assigned → AI performs work → Creates PR
- Doesn't follow the established riddle-finder pattern
- No issue template for mapper requests
- Auto-assign workflow doesn't support mapper requests

---

## Database System Available (Underutilized)

### Schema (system/database/schema/core.sql)
- **20+ interconnected tables** including:
  - `repository_metadata` - Repo configuration
  - `scan_history` - Complete audit trail
  - `files` - File metadata and statistics
  - `functions` - Function definitions with signatures
  - `classes` - Class structures
  - `imports/exports` - Module tracking
  - `dependencies` - Dependency graph
  - `languages` - Language statistics
  - `components` - Component categorization
  - And more...

### Database API (system/database/lib/database.js)
Provides comprehensive methods:
- **Repository**: `getOrCreateRepository()`, `updateRepositoryStats()`
- **Scans**: `startScan()`, `completeScan()`, `failScan()`
- **Files**: `upsertFile()`, `getFileByPath()`, `getAllFiles()`
- **Functions**: `addFunction()`, `getFunctionsByFile()`, `searchFunctions()`
- **Dependencies**: `addImport()`, `addExport()`, `addDependency()`, `getDependencyGraph()`
- **Analytics**: `getRepositoryMetrics()`, `getComplexityReport()`, `getDependencyReport()`
- **Search**: `fullTextSearch()` using FTS5 virtual tables
- **Transactions**: Complete ACID support

### CLI Tool (system/database/cli/repo-db.js)
Powerful command-line interface:
```bash
./cli/repo-db.js stats        # Database statistics
./cli/repo-db.js files         # List files
./cli/repo-db.js functions     # List functions
./cli/repo-db.js search "term" # Full-text search
./cli/repo-db.js deps          # Dependency graph
./cli/repo-db.js complexity    # Complexity report
```

---

## Solution Implemented

### 1. **Updated Agent Instructions**

**File**: `.github/agents/repo-mapper.agent.md`

**Key Changes**:
- ✅ Comprehensive instructions for database integration
- ✅ Step-by-step guide for using the database API
- ✅ AI-powered code analysis guidelines (not regex)
- ✅ Complete workflow from scanning to output generation
- ✅ Database operation examples with code snippets
- ✅ Support for full and incremental scans
- ✅ Transaction usage patterns
- ✅ Error handling best practices
- ✅ Verification instructions

**What the Agent Now Does**:

1. **Initialize Database Connection**
   ```javascript
   const db = new RepositoryDatabase();
   await db.connect();
   const repo = await db.getOrCreateRepository('owner', 'repo', 'url');
   const scanId = await db.startScan(repo.id, 'full');
   ```

2. **Scan Repository with AI Understanding**
   - Traverse all files (excluding .git, node_modules)
   - Use AI to understand code purpose (not just regex)
   - Extract functions with contextual analysis
   - Calculate cyclomatic complexity
   - Identify design patterns

3. **Populate Database**
   - Store files with metadata
   - Track all functions, classes, constants
   - Build complete dependency graph
   - Calculate and store metrics
   - Track language statistics

4. **Generate Output Files** (from database)
   - `repo-map.json` - Complete repository structure
   - `code-index.json` - Searchable code index
   - `ARCHITECTURE.md` - Human-readable documentation
   - `metrics.json` - Statistics and analytics

5. **Complete Scan**
   ```javascript
   await db.completeScan(scanId, filesScanned, linesScanned);
   ```

### 2. **Issue Template Created**

**File**: `.github/ISSUE_TEMPLATE/mapper_request.md`

Provides:
- Clear issue template for mapping requests
- Scan type options (full, incremental, quick)
- Priority area selections
- Expected actions list
- Verification commands
- Auto-assignment information

### 3. **Updated Workflow**

**File**: `.github/workflows/repo-mapper-agent.yml`

**Changes**:
- Removed 288-line hardcoded script
- Replaced with simple info job
- Explains new workflow pattern
- Provides usage instructions
- Documents database integration
- Manual trigger still available for testing

**New Pattern**:
1. User creates issue with `mapper-request` label
2. Auto-assign workflow assigns github-copilot[bot]
3. Copilot reads agent instructions
4. Copilot performs AI-powered analysis
5. Copilot updates database
6. Copilot generates output files
7. Copilot creates PR for review

### 4. **Updated Auto-Assign Workflow**

**File**: `.github/workflows/auto-assign-copilot.yml`

**Changes**:
- Now handles both `riddle-request` and `mapper-request` labels
- Provides context-specific guidance comments
- Explains database integration for mapper requests
- Shows verification commands
- Links to agent documentation

---

## Database Integration Details

### What Gets Stored

#### Files Table
```sql
- id, name, path, file_type, extension
- size_bytes, lines_count, code_lines, comment_lines, blank_lines
- hash (for change detection)
- purpose (AI-inferred)
- complexity_score
- timestamps
```

#### Functions Table
```sql
- id, name, signature
- line_start, line_end
- is_async, is_exported, is_arrow_function
- complexity (cyclomatic)
- purpose (AI-inferred)
```

#### Dependencies Table
```sql
- from_file_id, to_file_id
- dependency_type, import_path
- is_resolved (whether target file exists)
```

#### Scan History Table
```sql
- scan_type (full/incremental)
- started_at, completed_at
- files_scanned, lines_scanned, errors_count
- status (running/completed/failed)
```

### Queries Available

```javascript
// Get all metrics
const metrics = await db.getRepositoryMetrics(repo.id);
// Returns: file stats, function stats, language breakdown, components

// Full-text search
const results = await db.fullTextSearch('authentication');
// Searches across files and functions

// Dependency graph
const deps = await db.getDependencyGraph(repo.id);
// Returns complete dependency relationships

// Complexity report
const complex = await db.getComplexityReport(repo.id);
// Top 20 most complex files with metrics
```

---

## Comparison: Before vs After

### Before (Hardcoded Script)

❌ **Simple regex parsing**
```javascript
const functionRegex = /function\s+(\w+)\s*\(/g;
```

❌ **No database integration**
```javascript
fs.writeFileSync('repo-map.json', JSON.stringify(repoMap));
```

❌ **No scan history**
- No audit trail
- No way to track what was scanned when

❌ **Limited analysis**
- Just extracts names
- No complexity calculation
- No purpose inference
- No pattern recognition

❌ **Direct commits**
- Script commits directly
- No PR workflow
- No review process

### After (AI-Powered Agent)

✅ **AI-powered code understanding**
```javascript
// Agent understands code contextually
// Infers purpose from implementation
// Recognizes design patterns
```

✅ **Full database integration**
```javascript
await db.transaction(async (db) => {
    const fileId = await db.upsertFile(repo.id, fileData);
    await db.addFunction(fileId, functionData);
    await db.addDependency(fromId, toId, type, path);
});
```

✅ **Complete scan history**
```javascript
const scanId = await db.startScan(repo.id, 'full');
// ... perform scan ...
await db.completeScan(scanId, files, lines, errors);
// Full audit trail in database
```

✅ **Comprehensive analysis**
- Cyclomatic complexity
- Purpose inference
- Dependency resolution
- Pattern recognition
- Metrics calculation

✅ **PR-based workflow**
- Issue → Assignment → Work → PR
- Review before merge
- Proper git workflow

---

## Key Features Enabled

### 1. Full-Text Search
```bash
./cli/repo-db.js search "authentication"
# Searches across all files and functions
# Uses FTS5 virtual tables for speed
```

### 2. Dependency Analysis
```bash
./cli/repo-db.js deps
# Shows file-to-file dependencies
# Identifies unresolved imports
# Helps understand code structure
```

### 3. Complexity Reports
```bash
./cli/repo-db.js complexity
# Lists most complex files
# Shows average function complexity
# Helps identify refactoring targets
```

### 4. Incremental Scans
```javascript
// Only scan changed files
if (scanType === 'incremental') {
    const existing = await db.getFileByPath(repo.id, path);
    if (existing && existing.hash === currentHash) {
        continue; // Skip unchanged
    }
}
```

### 5. Transaction Support
```javascript
// All-or-nothing updates
await db.transaction(async (db) => {
    // If any operation fails, all roll back
    // Ensures data consistency
});
```

---

## Verification Steps

### For Users
After mapper completes:

```bash
cd system/database

# View overall statistics
npm run stats

# List all files in database
./cli/repo-db.js files --limit 50

# List all functions
./cli/repo-db.js functions --limit 50

# Search for specific code
./cli/repo-db.js search "riddle"

# View dependency graph
./cli/repo-db.js deps --limit 30

# See complexity report
./cli/repo-db.js complexity --limit 10

# Export to JSON
./cli/repo-db.js export > backup.json
```

### For Developers
```javascript
const db = new RepositoryDatabase();
await db.connect();

// Get repository
const repo = await db.queryOne(
    'SELECT * FROM repository_metadata ORDER BY last_updated DESC LIMIT 1'
);

// Check scan history
const scans = await db.query(
    'SELECT * FROM scan_history WHERE repo_metadata_id = ? ORDER BY started_at DESC',
    [repo.id]
);

// Verify file count
const fileCount = await db.queryOne(
    'SELECT COUNT(*) as count FROM files WHERE repo_metadata_id = ?',
    [repo.id]
);

console.log(`Files in database: ${fileCount.count}`);
console.log(`Last scan: ${scans[0].completed_at}`);
```

---

## Usage Guide

### Creating a Mapping Request

1. **Go to Issues tab**
2. **Click "New Issue"**
3. **Select "Repository_Mapper_Request" template**
4. **Fill in details**:
   - Choose scan type (full/incremental/quick)
   - Select priority areas
5. **Submit issue**

### What Happens Next

1. **Auto-assignment**
   - github-copilot[bot] is automatically assigned
   - Guidance comment is posted

2. **Agent reads instructions**
   - Loads `.github/agents/repo-mapper.agent.md`
   - Understands database integration requirements
   - Plans the work

3. **Agent performs mapping**
   - Connects to database
   - Scans repository
   - AI-powered code analysis
   - Populates database
   - Generates output files

4. **Agent creates PR**
   - Shows all changes
   - Includes verification instructions
   - Ready for review

5. **Review and merge**
   - Maintainer reviews PR
   - Checks database updates
   - Merges when satisfied

---

## Benefits

### For the Repository

✅ **Comprehensive metadata** - Every file, function, class tracked
✅ **Queryable information** - SQL queries for any question
✅ **Fast search** - Full-text search across codebase
✅ **Dependency tracking** - Understand relationships
✅ **Complexity metrics** - Identify technical debt
✅ **Audit trail** - Complete scan history
✅ **Backward compatibility** - JSON files still generated

### For Development

✅ **AI-powered analysis** - Understands code contextually
✅ **Pattern recognition** - Identifies design patterns
✅ **Purpose inference** - Determines what code does
✅ **Proper workflow** - Issue → Assignment → PR → Review
✅ **Error handling** - Graceful failures with tracking
✅ **Incremental updates** - Fast updates for small changes

### For Maintenance

✅ **CLI tools** - Easy querying and reporting
✅ **Transaction safety** - Data consistency guaranteed
✅ **Database backups** - Built-in backup system
✅ **Migration support** - Upgrade path from JSON
✅ **Documentation** - Comprehensive guides
✅ **Examples** - Code snippets throughout

---

## Technical Details

### Database Location
- **File**: `system/database/repo.db` (SQLite)
- **Schema**: `system/database/schema/core.sql`
- **Size**: ~500KB for typical repo
- **Format**: SQLite 3, WAL mode

### API Library
- **Location**: `system/database/lib/database.js`
- **Class**: `RepositoryDatabase`
- **Methods**: 40+ database operations
- **Dependencies**: `sqlite3`, `commander`, `cli-table3`

### CLI Tool
- **Location**: `system/database/cli/repo-db.js`
- **Commands**: stats, files, functions, search, deps, complexity, export, backup
- **Usage**: `./cli/repo-db.js <command> [options]`

### Output Files
1. **repo-map.json** - Complete repository structure
2. **code-index.json** - Searchable code index
3. **ARCHITECTURE.md** - Human-readable docs with Mermaid diagrams
4. **metrics.json** - Statistics and analytics

---

## Future Enhancements

### Planned Features
- [ ] Real-time incremental updates
- [ ] Git history integration
- [ ] Code change tracking over time
- [ ] Multi-repository support
- [ ] GraphQL API
- [ ] Web dashboard for visualization
- [ ] Plugin system for custom analyzers
- [ ] Integration with IDE extensions

### Database Schema Evolution
- [ ] Code coverage tracking
- [ ] Test file associations
- [ ] Documentation coverage metrics
- [ ] Security vulnerability tracking
- [ ] Performance metrics
- [ ] API endpoint documentation

---

## Migration from JSON

For repositories currently using JSON files:

```bash
cd system/database

# Install dependencies
npm install

# Initialize database
npm run init

# Migrate existing JSON data
npm run migrate

# Verify migration
npm run stats
./cli/repo-db.js files
```

The migration tool:
1. Reads existing JSON files
2. Creates database tables
3. Imports all data
4. Preserves relationships
5. Generates reports

---

## Troubleshooting

### Database Connection Issues
```javascript
// Check if database file exists
const fs = require('fs');
const dbPath = 'system/database/repo.db';
if (!fs.existsSync(dbPath)) {
    console.log('Database not found. Run: npm run init');
}

// Test connection
const db = new RepositoryDatabase();
await db.connect();
console.log('Connected!');
await db.close();
```

### Agent Not Starting
1. Check issue has correct label (`mapper-request`)
2. Verify auto-assign workflow ran
3. Check github-copilot[bot] was assigned
4. Review workflow logs

### Incomplete Scan
```javascript
// Check scan history
const scans = await db.query(
    'SELECT * FROM scan_history ORDER BY started_at DESC LIMIT 5'
);

// Find failed scans
const failed = scans.filter(s => s.status === 'failed');
```

---

## Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Repository                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌─────────────────────┐      │
│  │   GitHub     │         │   Repo-Mapper       │      │
│  │   Issue      │────────▶│   Agent             │      │
│  └──────────────┘         └─────────────────────┘      │
│        │                            │                    │
│        │ auto-assign                │ reads             │
│        ▼                            ▼                    │
│  ┌──────────────┐         ┌─────────────────────┐      │
│  │ github-      │         │  .github/agents/    │      │
│  │ copilot[bot] │         │  repo-mapper.md     │      │
│  └──────────────┘         └─────────────────────┘      │
│        │                                                 │
│        │ performs work                                   │
│        ▼                                                 │
│  ┌────────────────────────────────────────────┐        │
│  │        AI-Powered Code Analysis             │        │
│  ├────────────────────────────────────────────┤        │
│  │ • Scans files                               │        │
│  │ • Understands code contextually             │        │
│  │ • Extracts functions, classes               │        │
│  │ • Calculates complexity                     │        │
│  │ • Builds dependency graph                   │        │
│  └────────────────────────────────────────────┘        │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────┐        │
│  │       SQLite Database (repo.db)             │        │
│  ├────────────────────────────────────────────┤        │
│  │ Tables:                                     │        │
│  │ • repository_metadata                       │        │
│  │ • scan_history                              │        │
│  │ • files                                     │        │
│  │ • functions                                 │        │
│  │ • classes, methods                          │        │
│  │ • imports, exports                          │        │
│  │ • dependencies                              │        │
│  │ • languages, components                     │        │
│  │ • Full-text search (FTS5)                   │        │
│  └────────────────────────────────────────────┘        │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────┐        │
│  │       Generate Output Files                 │        │
│  ├────────────────────────────────────────────┤        │
│  │ • repo-map.json                             │        │
│  │ • code-index.json                           │        │
│  │ • ARCHITECTURE.md                           │        │
│  │ • metrics.json                              │        │
│  └────────────────────────────────────────────┘        │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────┐        │
│  │          Create Pull Request                │        │
│  └────────────────────────────────────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```
repository_metadata ──┬── scan_history
                      ├── files ──┬── functions
                      │           ├── classes ──── methods
                      │           ├── constants
                      │           ├── imports
                      │           ├── exports
                      │           └── file_components ── components
                      ├── languages
                      ├── entry_points
                      └── quality_metrics

dependencies (file_id → file_id)

FTS5 Virtual Tables:
├── files_fts (name, path, purpose)
└── functions_fts (name, signature, purpose)
```

---

## Conclusion

The repo-mapper agent system has been comprehensively updated to:

1. ✅ **Integrate with SQLite database** - Uses the full power of the database system
2. ✅ **AI-powered analysis** - Contextual understanding, not just regex
3. ✅ **Follow proper workflow** - Issue → Assignment → PR pattern
4. ✅ **Provide comprehensive instructions** - Clear agent documentation
5. ✅ **Enable powerful queries** - Full-text search, analytics, reports
6. ✅ **Track history** - Complete audit trail of all scans
7. ✅ **Support verification** - CLI tools for validation
8. ✅ **Maintain compatibility** - Still generates JSON files

The system is now production-ready and follows best practices for AI agent integration, database design, and workflow automation.

---

**Author**: GitHub Copilot Agent System
**Date**: December 7, 2025
**Version**: 1.0.0
