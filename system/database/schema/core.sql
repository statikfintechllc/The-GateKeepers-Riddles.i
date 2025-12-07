-- Core Database Schema for Repository Management System
-- Version: 1.0.0
-- Description: State-of-the-art database schema for mono-repo management

-- ============================================================================
-- METADATA TABLES
-- ============================================================================

-- Repository metadata and configuration
CREATE TABLE IF NOT EXISTS repository_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_name TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_url TEXT,
    version TEXT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scan_type TEXT CHECK(scan_type IN ('full', 'incremental', 'partial')),
    total_files INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_owner, repo_name)
);

-- Tracks scanning history
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    scan_type TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    files_scanned INTEGER DEFAULT 0,
    lines_scanned INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('running', 'completed', 'failed', 'partial')),
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE
);

-- ============================================================================
-- FILE SYSTEM TABLES
-- ============================================================================

-- Directory structure
CREATE TABLE IF NOT EXISTS directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    parent_id INTEGER,
    depth INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES directories(id) ON DELETE CASCADE,
    UNIQUE(repo_metadata_id, path)
);

-- File metadata and content information
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    directory_id INTEGER,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    file_type TEXT,
    extension TEXT,
    size_bytes INTEGER DEFAULT 0,
    lines_count INTEGER DEFAULT 0,
    code_lines INTEGER DEFAULT 0,
    comment_lines INTEGER DEFAULT 0,
    blank_lines INTEGER DEFAULT 0,
    hash TEXT, -- File content hash for change detection
    purpose TEXT,
    complexity_score REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP,
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE,
    FOREIGN KEY (directory_id) REFERENCES directories(id) ON DELETE SET NULL,
    UNIQUE(repo_metadata_id, path)
);

-- ============================================================================
-- CODE STRUCTURE TABLES
-- ============================================================================

-- Functions and methods
CREATE TABLE IF NOT EXISTS functions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    signature TEXT,
    line_start INTEGER,
    line_end INTEGER,
    is_async BOOLEAN DEFAULT 0,
    is_exported BOOLEAN DEFAULT 0,
    is_arrow_function BOOLEAN DEFAULT 0,
    complexity INTEGER DEFAULT 0,
    purpose TEXT,
    parameters TEXT, -- JSON array
    return_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Classes and their metadata
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    is_exported BOOLEAN DEFAULT 0,
    extends_class TEXT,
    implements_interfaces TEXT, -- JSON array
    purpose TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Methods within classes
CREATE TABLE IF NOT EXISTS methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    signature TEXT,
    line_start INTEGER,
    line_end INTEGER,
    is_static BOOLEAN DEFAULT 0,
    is_async BOOLEAN DEFAULT 0,
    is_private BOOLEAN DEFAULT 0,
    complexity INTEGER DEFAULT 0,
    purpose TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Constants and global variables
CREATE TABLE IF NOT EXISTS constants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT,
    type TEXT,
    line_number INTEGER,
    is_exported BOOLEAN DEFAULT 0,
    purpose TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================================================
-- DEPENDENCY TABLES
-- ============================================================================

-- Module imports and exports
CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    imported_from TEXT NOT NULL,
    imported_items TEXT, -- JSON array of imported symbols
    import_type TEXT CHECK(import_type IN ('default', 'named', 'namespace', 'dynamic')),
    line_number INTEGER,
    is_external BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    exported_name TEXT NOT NULL,
    export_type TEXT CHECK(export_type IN ('default', 'named', 'namespace')),
    line_number INTEGER,
    ref_to TEXT, -- What this export references
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- File-to-file dependencies
CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_file_id INTEGER NOT NULL,
    to_file_id INTEGER,
    dependency_type TEXT NOT NULL,
    import_path TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (to_file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================================================
-- COMPONENT CATEGORIZATION
-- ============================================================================

-- Component types (ui, logic, data, infrastructure, documentation)
CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('ui', 'logic', 'data', 'infrastructure', 'documentation', 'test', 'config')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map files to components
CREATE TABLE IF NOT EXISTS file_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    relevance_score REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    UNIQUE(file_id, component_id)
);

-- ============================================================================
-- METRICS AND ANALYSIS
-- ============================================================================

-- Language statistics
CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_count INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    percentage REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE,
    UNIQUE(repo_metadata_id, name)
);

-- Code quality metrics
CREATE TABLE IF NOT EXISTS quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL,
    metric_category TEXT CHECK(metric_category IN ('quality', 'performance', 'security', 'maintainability')),
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE
);

-- Entry points tracking
CREATE TABLE IF NOT EXISTS entry_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_metadata_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    entry_type TEXT CHECK(entry_type IN ('main', 'module', 'script', 'page', 'worker')),
    description TEXT,
    loads TEXT, -- JSON array of dependencies
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_metadata_id) REFERENCES repository_metadata(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================================================
-- TAGS AND ANNOTATIONS
-- ============================================================================

-- Flexible tagging system
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File tags
CREATE TABLE IF NOT EXISTS file_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(file_id, tag_id)
);

-- ============================================================================
-- SEARCH AND INDEXING
-- ============================================================================

-- Full-text search index for functions
CREATE VIRTUAL TABLE IF NOT EXISTS functions_fts USING fts5(
    name,
    signature,
    purpose,
    content=functions,
    content_rowid=id
);

-- Full-text search index for files
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    name,
    path,
    purpose,
    content=files,
    content_rowid=id
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_files_repo ON files(repo_metadata_id);
CREATE INDEX IF NOT EXISTS idx_files_directory ON files(directory_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

CREATE INDEX IF NOT EXISTS idx_functions_file ON functions(file_id);
CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name);
CREATE INDEX IF NOT EXISTS idx_functions_exported ON functions(is_exported);

CREATE INDEX IF NOT EXISTS idx_classes_file ON classes(file_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

CREATE INDEX IF NOT EXISTS idx_methods_class ON methods(class_id);
CREATE INDEX IF NOT EXISTS idx_methods_name ON methods(name);

CREATE INDEX IF NOT EXISTS idx_imports_file ON imports(file_id);
CREATE INDEX IF NOT EXISTS idx_imports_from ON imports(imported_from);

CREATE INDEX IF NOT EXISTS idx_exports_file ON exports(file_id);
CREATE INDEX IF NOT EXISTS idx_exports_name ON exports(exported_name);

CREATE INDEX IF NOT EXISTS idx_dependencies_from ON dependencies(from_file_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_to ON dependencies(to_file_id);

CREATE INDEX IF NOT EXISTS idx_scan_history_repo ON scan_history(repo_metadata_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_status ON scan_history(status);

CREATE INDEX IF NOT EXISTS idx_directories_repo ON directories(repo_metadata_id);
CREATE INDEX IF NOT EXISTS idx_directories_parent ON directories(parent_id);

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Update timestamps automatically
CREATE TRIGGER IF NOT EXISTS update_files_timestamp 
AFTER UPDATE ON files
BEGIN
    UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_directories_timestamp 
AFTER UPDATE ON directories
BEGIN
    UPDATE directories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_languages_timestamp 
AFTER UPDATE ON languages
BEGIN
    UPDATE languages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Maintain FTS index for functions
CREATE TRIGGER IF NOT EXISTS functions_fts_insert AFTER INSERT ON functions
BEGIN
    INSERT INTO functions_fts(rowid, name, signature, purpose)
    VALUES (NEW.id, NEW.name, NEW.signature, NEW.purpose);
END;

CREATE TRIGGER IF NOT EXISTS functions_fts_update AFTER UPDATE ON functions
BEGIN
    UPDATE functions_fts SET name = NEW.name, signature = NEW.signature, purpose = NEW.purpose
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS functions_fts_delete AFTER DELETE ON functions
BEGIN
    DELETE FROM functions_fts WHERE rowid = OLD.id;
END;

-- Maintain FTS index for files
CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files
BEGIN
    INSERT INTO files_fts(rowid, name, path, purpose)
    VALUES (NEW.id, NEW.name, NEW.path, NEW.purpose);
END;

CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files
BEGIN
    UPDATE files_fts SET name = NEW.name, path = NEW.path, purpose = NEW.purpose
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files
BEGIN
    DELETE FROM files_fts WHERE rowid = OLD.id;
END;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Comprehensive file view with all metadata
CREATE VIEW IF NOT EXISTS v_files_complete AS
SELECT 
    f.id,
    f.name,
    f.path,
    f.file_type,
    f.extension,
    f.size_bytes,
    f.lines_count,
    f.code_lines,
    f.comment_lines,
    f.blank_lines,
    f.purpose,
    f.complexity_score,
    d.path as directory_path,
    rm.repo_name,
    rm.repo_owner,
    (SELECT COUNT(*) FROM functions WHERE file_id = f.id) as function_count,
    (SELECT COUNT(*) FROM classes WHERE file_id = f.id) as class_count,
    (SELECT COUNT(*) FROM imports WHERE file_id = f.id) as import_count,
    (SELECT COUNT(*) FROM exports WHERE file_id = f.id) as export_count
FROM files f
LEFT JOIN directories d ON f.directory_id = d.id
LEFT JOIN repository_metadata rm ON f.repo_metadata_id = rm.id;

-- Dependency graph view
CREATE VIEW IF NOT EXISTS v_dependency_graph AS
SELECT 
    d.id,
    f1.path as from_file,
    f2.path as to_file,
    d.dependency_type,
    d.import_path,
    d.is_resolved
FROM dependencies d
JOIN files f1 ON d.from_file_id = f1.id
LEFT JOIN files f2 ON d.to_file_id = f2.id;

-- Language summary view
CREATE VIEW IF NOT EXISTS v_language_summary AS
SELECT 
    rm.repo_name,
    l.name as language,
    l.file_count,
    l.total_lines,
    l.percentage,
    l.updated_at
FROM languages l
JOIN repository_metadata rm ON l.repo_metadata_id = rm.id
ORDER BY l.percentage DESC;

-- Component summary view
CREATE VIEW IF NOT EXISTS v_component_summary AS
SELECT 
    c.name as component,
    c.type,
    COUNT(fc.file_id) as file_count,
    SUM(f.lines_count) as total_lines,
    AVG(f.complexity_score) as avg_complexity
FROM components c
LEFT JOIN file_components fc ON c.id = fc.component_id
LEFT JOIN files f ON fc.file_id = f.id
GROUP BY c.id, c.name, c.type;

-- Function summary view
CREATE VIEW IF NOT EXISTS v_function_summary AS
SELECT 
    fn.id,
    fn.name,
    fn.signature,
    fn.is_exported,
    fn.is_async,
    fn.complexity,
    f.path as file_path,
    f.file_type
FROM functions fn
JOIN files f ON fn.file_id = f.id;

-- Export/Import mapping view
-- WARNING: This view contains a LIKE pattern with wildcards that cannot use indexes
-- and will perform full table scans. It may cause severe performance issues on large codebases.
-- 
-- Recommendation: Do NOT use this view in production with large datasets.
-- Instead, query the exports and imports tables directly with exact matches.
-- 
-- This view is kept for backward compatibility but should be considered deprecated.
CREATE VIEW IF NOT EXISTS v_module_exports AS
SELECT 
    e.id,
    e.exported_name,
    e.export_type,
    f.path as file_path,
    -- WARNING: This subquery uses LIKE which prevents index usage
    -- It will perform full table scans and cannot be optimized
    (SELECT GROUP_CONCAT(i.file_id) 
     FROM imports i 
     JOIN files f2 ON i.file_id = f2.id 
     WHERE i.imported_from LIKE '%' || f.name || '%') as imported_by
FROM exports e
JOIN files f ON e.file_id = f.id;
