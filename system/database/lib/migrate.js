#!/usr/bin/env node
/**
 * Data Migration Tool
 * Migrates data from legacy JSON files to the new SQLite database
 */

const RepositoryDatabase = require('./database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DataMigrator {
    constructor(dbPath = null) {
        this.db = new RepositoryDatabase(dbPath);
        this.dataDir = path.join(__dirname, '../data');
        this.repoMapPath = path.join(this.dataDir, 'repo-map.json');
        this.codeIndexPath = path.join(this.dataDir, 'code-index.json');
        this.metricsPath = path.join(this.dataDir, 'metrics.json');
    }

    /**
     * Calculate file identifier for tracking
     * Note: This creates a simple identifier based on path and size, not a true content hash
     */
    calculateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Read JSON file safely
     */
    readJSON(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`File not found: ${filePath}`);
                return null;
            }
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error reading or parsing JSON from ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Migrate repository metadata
     */
    async migrateRepositoryMetadata(repoMap) {
        console.log('Migrating repository metadata...');
        
        const metadata = repoMap.metadata || {};
        const repo = await this.db.getOrCreateRepository(
            'statikfintechllc',
            'The_GateKeepers_Riddle.Interactive',
            'https://github.com/statikfintechllc/The_GateKeepers_Riddle.Interactive'
        );

        await this.db.updateRepositoryStats(
            repo.id,
            metadata.totalFiles || 0,
            metadata.totalLines || 0
        );

        console.log(`  ✓ Repository metadata migrated (ID: ${repo.id})`);
        return repo.id;
    }

    /**
     * Migrate files from repo-map.json
     */
    async migrateFiles(repoId, repoMap) {
        console.log('Migrating files...');
        
        const files = repoMap.files || {};
        let migratedCount = 0;
        const fileIdMap = {};

        for (const [filePath, fileData] of Object.entries(files)) {
            try {
                const fileInfo = {
                    name: fileData.name || path.basename(filePath),
                    path: filePath,
                    file_type: fileData.type || path.extname(filePath).slice(1),
                    extension: path.extname(filePath).slice(1),
                    size_bytes: fileData.size || 0,
                    lines_count: fileData.lines || 0,
                    code_lines: fileData.lines || 0,
                    comment_lines: 0,
                    blank_lines: 0,
                    hash: this.calculateHash(filePath + fileData.size),
                    purpose: fileData.purpose || 'Unknown',
                    complexity_score: 0
                };

                const fileId = await this.db.upsertFile(repoId, fileInfo);
                fileIdMap[filePath] = fileId;
                migratedCount++;
            } catch (error) {
                console.error(`  ✗ Error migrating file ${filePath}:`, error.message);
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} files`);
        return fileIdMap;
    }

    /**
     * Migrate functions from code-index.json
     */
    async migrateFunctions(fileIdMap, codeIndex) {
        console.log('Migrating functions...');
        
        const functions = codeIndex.functions || {};
        let migratedCount = 0;

        for (const [funcName, funcData] of Object.entries(functions)) {
            try {
                const filePath = funcData.file;
                const fileId = fileIdMap[filePath];

                if (!fileId) {
                    console.warn(`  ⚠ File not found for function ${funcName}: ${filePath}`);
                    continue;
                }

                const functionInfo = {
                    name: funcName,
                    signature: funcData.signature || null,
                    line_start: funcData.line || 0,
                    line_end: funcData.line || 0,
                    is_async: false,
                    is_exported: true,
                    is_arrow_function: false,
                    complexity: 0,
                    purpose: funcData.purpose || null
                };

                await this.db.addFunction(fileId, functionInfo);
                migratedCount++;
            } catch (error) {
                console.error(`  ✗ Error migrating function ${funcName}:`, error.message);
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} functions`);
    }

    /**
     * Migrate exports from code-index.json
     */
    async migrateExports(fileIdMap, codeIndex) {
        console.log('Migrating exports...');
        
        const exports = codeIndex.exports || {};
        let migratedCount = 0;

        for (const [exportName, exportData] of Object.entries(exports)) {
            try {
                const filePath = exportData.file;
                const fileId = fileIdMap[filePath];

                if (!fileId) {
                    console.warn(`  ⚠ File not found for export ${exportName}: ${filePath}`);
                    continue;
                }

                const exportInfo = {
                    exported_name: exportName,
                    export_type: 'named',
                    line_number: 0,
                    references: null
                };

                await this.db.addExport(fileId, exportInfo);
                migratedCount++;
            } catch (error) {
                console.error(`  ✗ Error migrating export ${exportName}:`, error.message);
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} exports`);
    }

    /**
     * Migrate dependencies from repo-map.json
     */
    async migrateDependencies(fileIdMap, repoMap) {
        console.log('Migrating dependencies...');
        
        const dependencies = repoMap.relationships?.dependencies || [];
        let migratedCount = 0;

        for (const dep of dependencies) {
            try {
                const fromPath = dep.from;
                const toPath = dep.to;
                const fromFileId = fileIdMap[fromPath];
                let toFileId = fileIdMap[toPath] || null;

                if (!fromFileId) {
                    console.warn(`  ⚠ Source file not found: ${fromPath}`);
                    continue;
                }

                await this.db.addDependency(fromFileId, toFileId, dep.type || 'import', toPath);
                migratedCount++;
            } catch (error) {
                console.error(`  ✗ Error migrating dependency:`, error.message);
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} dependencies`);
    }

    /**
     * Migrate language statistics from metrics.json
     */
    async migrateLanguages(repoId, metrics) {
        console.log('Migrating language statistics...');
        
        const languages = metrics.languages || {};
        let migratedCount = 0;

        for (const [langName, langData] of Object.entries(languages)) {
            try {
                const languageInfo = {
                    name: langName,
                    file_count: langData.files || 0,
                    total_lines: 0,
                    percentage: langData.percentage || 0
                };

                await this.db.upsertLanguage(repoId, languageInfo);
                migratedCount++;
            } catch (error) {
                console.error(`  ✗ Error migrating language ${langName}:`, error.message);
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} languages`);
    }

    /**
     * Migrate component categorization
     */
    async migrateComponents(fileIdMap, repoMap) {
        console.log('Migrating component categorization...');
        
        const components = repoMap.components || {};
        let migratedCount = 0;

        // Dynamically fetch component IDs from the database
        const componentMap = {};
        const dbComponents = await this.db.query('SELECT id, type FROM components');
        for (const comp of dbComponents) {
            componentMap[comp.type] = comp.id;
        }

        for (const [componentType, files] of Object.entries(components)) {
            const componentId = componentMap[componentType];
            if (!componentId) continue;

            for (const filePath of files) {
                try {
                    const fileId = fileIdMap[filePath];
                    if (!fileId) continue;

                    await this.db.execute(
                        'INSERT OR IGNORE INTO file_components (file_id, component_id) VALUES (?, ?)',
                        [fileId, componentId]
                    );
                    migratedCount++;
                } catch (error) {
                    console.error(`  ✗ Error migrating component for ${filePath}:`, error.message);
                }
            }
        }

        console.log(`  ✓ Migrated ${migratedCount} file-component mappings`);
    }

    /**
     * Main migration process
     */
    async migrate() {
        console.log('\n========================================');
        console.log('Starting Data Migration');
        console.log('========================================\n');

        try {
            // Connect to database
            await this.db.connect();
            console.log('✓ Connected to database\n');

            // Load JSON data
            console.log('Loading legacy data files...');
            const repoMap = this.readJSON(this.repoMapPath);
            const codeIndex = this.readJSON(this.codeIndexPath);
            const metrics = this.readJSON(this.metricsPath);

            if (!repoMap) {
                throw new Error('Failed to load repo-map.json');
            }

            console.log('✓ Loaded legacy data files\n');

            // Start scan
            const repoId = await this.migrateRepositoryMetadata(repoMap);
            const scanId = await this.db.startScan(repoId, 'migration');

            // Begin transaction
            await this.db.beginTransaction();

            try {
                // Migrate files
                const fileIdMap = await this.migrateFiles(repoId, repoMap);

                // Migrate functions and exports
                if (codeIndex) {
                    await this.migrateFunctions(fileIdMap, codeIndex);
                    await this.migrateExports(fileIdMap, codeIndex);
                }

                // Migrate dependencies
                await this.migrateDependencies(fileIdMap, repoMap);

                // Migrate languages
                if (metrics) {
                    await this.migrateLanguages(repoId, metrics);
                }

                // Migrate components
                await this.migrateComponents(fileIdMap, repoMap);

                // Commit transaction
                await this.db.commit();
                console.log('\n✓ Transaction committed successfully');

                // Complete scan
                await this.db.completeScan(scanId, Object.keys(fileIdMap).length, repoMap.metadata?.totalLines || 0);

                console.log('\n========================================');
                console.log('Migration Completed Successfully!');
                console.log('========================================\n');

                // Display summary
                const reportMetrics = await this.db.getRepositoryMetrics(repoId);
                console.log('Summary:');
                console.log(`  Files:     ${reportMetrics.files.total_files}`);
                console.log(`  Functions: ${reportMetrics.functions.total_functions}`);
                console.log(`  Languages: ${reportMetrics.languages.length}`);
                console.log('');

            } catch (error) {
                await this.db.rollback();
                console.error('\n✗ Migration failed, rolling back changes');
                throw error;
            }

        } catch (error) {
            console.error('\nMigration Error:', error.message);
            process.exit(1);
        } finally {
            await this.db.close();
        }
    }
}

// CLI execution
if (require.main === module) {
    const migrator = new DataMigrator();
    migrator.migrate();
}

module.exports = DataMigrator;
