#!/usr/bin/env node
/**
 * Database Access Layer (DAL)
 * Provides high-level API for interacting with the repository database
 * Mimics PostgreSQL functionality using SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class RepositoryDatabase {
    constructor(dbPath = null) {
        // Use environment variable, passed path, or default location
        this.dbPath = dbPath || 
                     process.env.REPO_DB_PATH || 
                     path.resolve(__dirname, '../../repo.db');
        this.db = null;
        this.isConnected = false;
    }

    /**
     * Connect to the database with connection pooling
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    reject(new Error(`Failed to connect to database: ${err.message}`));
                } else {
                    this.isConnected = true;
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.isConnected = false;
                    resolve();
                }
            });
        });
    }

    /**
     * Execute a query with parameters
     */
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(new Error(`Query error: ${err.message}\nSQL: ${sql}`));
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Execute a query and return first row
     */
    async queryOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Execute an INSERT/UPDATE/DELETE statement
     */
    async execute(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(new Error(`Execute error: ${err.message}\nSQL: ${sql}`));
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Begin transaction
     */
    async beginTransaction() {
        await this.execute('BEGIN TRANSACTION');
    }

    /**
     * Commit transaction
     */
    async commit() {
        await this.execute('COMMIT');
    }

    /**
     * Rollback transaction
     */
    async rollback() {
        await this.execute('ROLLBACK');
    }

    /**
     * Execute multiple statements in a transaction
     */
    async transaction(callback) {
        try {
            await this.beginTransaction();
            const result = await callback(this);
            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    // ============================================================================
    // REPOSITORY METADATA OPERATIONS
    // ============================================================================

    async getOrCreateRepository(owner, name, url = null) {
        let repo = await this.queryOne(
            'SELECT * FROM repository_metadata WHERE repo_owner = ? AND repo_name = ?',
            [owner, name]
        );

        if (!repo) {
            const result = await this.execute(
                `INSERT INTO repository_metadata (repo_owner, repo_name, repo_url, version) 
                 VALUES (?, ?, ?, ?)`,
                [owner, name, url, '1.0.0']
            );
            repo = await this.queryOne('SELECT * FROM repository_metadata WHERE id = ?', [result.lastID]);
        }

        return repo;
    }

    async updateRepositoryStats(repoId, totalFiles, totalLines) {
        await this.execute(
            `UPDATE repository_metadata 
             SET total_files = ?, total_lines = ?, last_updated = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [totalFiles, totalLines, repoId]
        );
    }

    // ============================================================================
    // SCAN HISTORY OPERATIONS
    // ============================================================================

    async startScan(repoId, scanType = 'full') {
        const result = await this.execute(
            `INSERT INTO scan_history (repo_metadata_id, scan_type, status) 
             VALUES (?, ?, 'running')`,
            [repoId, scanType]
        );
        return result.lastID;
    }

    async completeScan(scanId, filesScanned, linesScanned, errorsCount = 0) {
        await this.execute(
            `UPDATE scan_history 
             SET completed_at = CURRENT_TIMESTAMP, 
                 files_scanned = ?,
                 lines_scanned = ?,
                 errors_count = ?,
                 status = 'completed'
             WHERE id = ?`,
            [filesScanned, linesScanned, errorsCount, scanId]
        );
    }

    async failScan(scanId) {
        await this.execute(
            `UPDATE scan_history 
             SET completed_at = CURRENT_TIMESTAMP, 
                 status = 'failed'
             WHERE id = ?`,
            [scanId]
        );
    }

    // ============================================================================
    // FILE OPERATIONS
    // ============================================================================

    async upsertFile(repoId, fileData) {
        const existing = await this.queryOne(
            'SELECT id FROM files WHERE repo_metadata_id = ? AND path = ?',
            [repoId, fileData.path]
        );

        if (existing) {
            await this.execute(
                `UPDATE files SET 
                    name = ?, file_type = ?, extension = ?, 
                    size_bytes = ?, lines_count = ?, code_lines = ?,
                    comment_lines = ?, blank_lines = ?, hash = ?,
                    purpose = ?, complexity_score = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    fileData.name, fileData.file_type, fileData.extension,
                    fileData.size_bytes, fileData.lines_count, fileData.code_lines,
                    fileData.comment_lines, fileData.blank_lines, fileData.hash,
                    fileData.purpose, fileData.complexity_score || 0,
                    existing.id
                ]
            );
            return existing.id;
        } else {
            const result = await this.execute(
                `INSERT INTO files (
                    repo_metadata_id, name, path, file_type, extension,
                    size_bytes, lines_count, code_lines, comment_lines, blank_lines,
                    hash, purpose, complexity_score
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    repoId, fileData.name, fileData.path, fileData.file_type, fileData.extension,
                    fileData.size_bytes, fileData.lines_count, fileData.code_lines,
                    fileData.comment_lines, fileData.blank_lines, fileData.hash,
                    fileData.purpose, fileData.complexity_score || 0
                ]
            );
            return result.lastID;
        }
    }

    async getFileByPath(repoId, path) {
        return await this.queryOne(
            'SELECT * FROM files WHERE repo_metadata_id = ? AND path = ?',
            [repoId, path]
        );
    }

    async getAllFiles(repoId) {
        return await this.query(
            'SELECT * FROM v_files_complete WHERE repo_metadata_id = ?',
            [repoId]
        );
    }

    // ============================================================================
    // FUNCTION OPERATIONS
    // ============================================================================

    async addFunction(fileId, functionData) {
        const result = await this.execute(
            `INSERT INTO functions (
                file_id, name, signature, line_start, line_end,
                is_async, is_exported, is_arrow_function, complexity, purpose
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fileId, functionData.name, functionData.signature,
                functionData.line_start, functionData.line_end,
                functionData.is_async || false, functionData.is_exported || false,
                functionData.is_arrow_function || false,
                functionData.complexity || 0, functionData.purpose
            ]
        );
        return result.lastID;
    }

    async getFunctionsByFile(fileId) {
        return await this.query(
            'SELECT * FROM functions WHERE file_id = ?',
            [fileId]
        );
    }

    async searchFunctions(searchTerm) {
        return await this.query(
            `SELECT f.*, files.path as file_path 
             FROM functions_fts fts
             JOIN functions f ON fts.rowid = f.id
             JOIN files ON f.file_id = files.id
             WHERE functions_fts MATCH ?
             ORDER BY rank`,
            [searchTerm]
        );
    }

    // ============================================================================
    // DEPENDENCY OPERATIONS
    // ============================================================================

    async addImport(fileId, importData) {
        const result = await this.execute(
            `INSERT INTO imports (
                file_id, imported_from, imported_items, import_type, line_number, is_external
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                fileId, importData.imported_from,
                JSON.stringify(importData.imported_items || []),
                importData.import_type, importData.line_number,
                importData.is_external || false
            ]
        );
        return result.lastID;
    }

    async addExport(fileId, exportData) {
        const result = await this.execute(
            `INSERT INTO exports (
                file_id, exported_name, export_type, line_number, ref_to
             ) VALUES (?, ?, ?, ?, ?)`,
            [
                fileId, exportData.exported_name, exportData.export_type,
                exportData.line_number, exportData.ref_to || exportData.references
            ]
        );
        return result.lastID;
    }

    async addDependency(fromFileId, toFileId, dependencyType, importPath) {
        const result = await this.execute(
            `INSERT INTO dependencies (
                from_file_id, to_file_id, dependency_type, import_path, is_resolved
             ) VALUES (?, ?, ?, ?, ?)`,
            [fromFileId, toFileId, dependencyType, importPath, toFileId !== null]
        );
        return result.lastID;
    }

    async getDependencyGraph(repoId) {
        return await this.query(
            `SELECT * FROM v_dependency_graph 
             WHERE from_file IN (SELECT path FROM files WHERE repo_metadata_id = ?)`,
            [repoId]
        );
    }

    // ============================================================================
    // LANGUAGE STATISTICS
    // ============================================================================

    async upsertLanguage(repoId, languageData) {
        const existing = await this.queryOne(
            'SELECT id FROM languages WHERE repo_metadata_id = ? AND name = ?',
            [repoId, languageData.name]
        );

        if (existing) {
            await this.execute(
                `UPDATE languages SET 
                    file_count = ?, total_lines = ?, percentage = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [languageData.file_count, languageData.total_lines, languageData.percentage, existing.id]
            );
            return existing.id;
        } else {
            const result = await this.execute(
                `INSERT INTO languages (repo_metadata_id, name, file_count, total_lines, percentage)
                 VALUES (?, ?, ?, ?, ?)`,
                [repoId, languageData.name, languageData.file_count, languageData.total_lines, languageData.percentage]
            );
            return result.lastID;
        }
    }

    async getLanguageStats(repoId) {
        return await this.query(
            'SELECT * FROM v_language_summary WHERE repo_name = (SELECT repo_name FROM repository_metadata WHERE id = ?)',
            [repoId]
        );
    }

    // ============================================================================
    // SEARCH OPERATIONS
    // ============================================================================

    async searchFiles(searchTerm) {
        return await this.query(
            `SELECT f.* FROM files_fts fts
             JOIN files f ON fts.rowid = f.id
             WHERE files_fts MATCH ?
             ORDER BY rank`,
            [searchTerm]
        );
    }

    async fullTextSearch(searchTerm) {
        const files = await this.searchFiles(searchTerm);
        const functions = await this.searchFunctions(searchTerm);
        return { files, functions };
    }

    // ============================================================================
    // ANALYTICS AND REPORTING
    // ============================================================================

    async getRepositoryMetrics(repoId) {
        const metrics = {};
        
        // File statistics
        const fileStats = await this.queryOne(
            `SELECT 
                COUNT(*) as total_files,
                SUM(lines_count) as total_lines,
                SUM(code_lines) as total_code_lines,
                SUM(size_bytes) as total_size,
                AVG(complexity_score) as avg_complexity
             FROM files WHERE repo_metadata_id = ?`,
            [repoId]
        );
        metrics.files = fileStats;

        // Function statistics
        const funcStats = await this.queryOne(
            `SELECT 
                COUNT(*) as total_functions,
                SUM(CASE WHEN is_exported THEN 1 ELSE 0 END) as exported_functions,
                SUM(CASE WHEN is_async THEN 1 ELSE 0 END) as async_functions,
                AVG(complexity) as avg_complexity
             FROM functions f
             JOIN files ON f.file_id = files.id
             WHERE files.repo_metadata_id = ?`,
            [repoId]
        );
        metrics.functions = funcStats;

        // Language statistics
        const languages = await this.query(
            'SELECT * FROM languages WHERE repo_metadata_id = ? ORDER BY percentage DESC',
            [repoId]
        );
        metrics.languages = languages;

        // Component statistics
        const components = await this.query(
            `SELECT c.name, c.type, COUNT(fc.file_id) as file_count
             FROM components c
             LEFT JOIN file_components fc ON c.id = fc.component_id
             LEFT JOIN files f ON fc.file_id = f.id
             WHERE f.repo_metadata_id = ? OR f.repo_metadata_id IS NULL
             GROUP BY c.id`,
            [repoId]
        );
        metrics.components = components;

        return metrics;
    }

    async getComplexityReport(repoId) {
        return await this.query(
            `SELECT 
                f.path,
                f.name,
                f.complexity_score as file_complexity,
                (SELECT COUNT(*) FROM functions WHERE file_id = f.id) as function_count,
                (SELECT AVG(complexity) FROM functions WHERE file_id = f.id) as avg_function_complexity
             FROM files f
             WHERE f.repo_metadata_id = ?
             ORDER BY f.complexity_score DESC
             LIMIT 20`,
            [repoId]
        );
    }

    async getDependencyReport(repoId) {
        return await this.query(
            `SELECT 
                f.path,
                f.name,
                (SELECT COUNT(*) FROM dependencies WHERE from_file_id = f.id) as outgoing_deps,
                (SELECT COUNT(*) FROM dependencies WHERE to_file_id = f.id) as incoming_deps
             FROM files f
             WHERE f.repo_metadata_id = ?
             ORDER BY outgoing_deps + incoming_deps DESC`,
            [repoId]
        );
    }
}

module.exports = RepositoryDatabase;

// CLI usage
if (require.main === module) {
    (async () => {
        const db = new RepositoryDatabase();
        try {
            await db.connect();
            console.log('Connected to database successfully!');
            
            // Example: Get repository metrics
            const repo = await db.getOrCreateRepository('statikfintechllc', 'The-GateKeepers-Riddles.i');
            console.log('Repository:', repo);
            
            const metrics = await db.getRepositoryMetrics(repo.id);
            console.log('Metrics:', JSON.stringify(metrics, null, 2));
            
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await db.close();
        }
    })();
}
