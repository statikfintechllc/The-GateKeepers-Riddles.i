#!/usr/bin/env node
/**
 * Database CLI Tool
 * Command-line interface for managing and querying the repository database
 */

const RepositoryDatabase = require('../lib/database');
const { program } = require('commander');
const Table = require('cli-table3');

class DatabaseCLI {
    constructor() {
        this.db = new RepositoryDatabase();
    }

    async connect() {
        await this.db.connect();
    }

    async close() {
        await this.db.close();
    }

    /**
     * Validate and parse limit option
     */
    validateLimit(limitStr, defaultValue = 20) {
        const limit = parseInt(limitStr, 10);
        if (isNaN(limit) || limit < 1) {
            throw new Error('Limit must be a positive number');
        }
        return limit;
    }

    /**
     * Display database statistics
     */
    async stats(options) {
        const repo = await this.db.queryOne(
            'SELECT * FROM repository_metadata ORDER BY last_updated DESC LIMIT 1'
        );

        if (!repo) {
            console.log('No repository data found in database.');
            return;
        }

        console.log('\n📊 Database Statistics\n');
        console.log('Repository:');
        console.log(`  Owner: ${repo.repo_owner}`);
        console.log(`  Name:  ${repo.repo_name}`);
        console.log(`  Files: ${repo.total_files}`);
        console.log(`  Lines: ${repo.total_lines}`);
        console.log(`  Last Updated: ${repo.last_updated}`);

        const metrics = await this.db.getRepositoryMetrics(repo.id);

        console.log('\nFiles:');
        console.log(`  Total Files:       ${metrics.files.total_files || 0}`);
        console.log(`  Total Lines:       ${metrics.files.total_lines || 0}`);
        console.log(`  Code Lines:        ${metrics.files.total_code_lines || 0}`);
        console.log(`  Total Size:        ${((metrics.files.total_size || 0) / 1024).toFixed(2)} KB`);
        console.log(`  Avg Complexity:    ${(metrics.files.avg_complexity || 0).toFixed(2)}`);

        console.log('\nFunctions:');
        console.log(`  Total Functions:   ${metrics.functions.total_functions || 0}`);
        console.log(`  Exported:          ${metrics.functions.exported_functions || 0}`);
        console.log(`  Async:             ${metrics.functions.async_functions || 0}`);
        console.log(`  Avg Complexity:    ${(metrics.functions.avg_complexity || 0).toFixed(2)}`);

        if (options.verbose) {
            console.log('\nLanguages:');
            const table = new Table({
                head: ['Language', 'Files', 'Lines', 'Percentage'],
                colWidths: [20, 10, 15, 15]
            });
            metrics.languages.forEach(lang => {
                table.push([
                    lang.name,
                    lang.file_count,
                    lang.total_lines,
                    `${lang.percentage.toFixed(1)}%`
                ]);
            });
            console.log(table.toString());
        }
    }

    /**
     * List files in the database
     */
    async listFiles(options) {
        const limit = this.validateLimit(options.limit || '20');
        const allowedSortFields = ['path', 'lines_count', 'size_bytes', 'name', 'file_type'];
        const sortField = options.sort || 'path';
        if (!allowedSortFields.includes(sortField)) {
            throw new Error(`Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`);
        }
        const files = await this.db.query(
            `SELECT path, name, file_type, lines_count, size_bytes 
             FROM files 
             ORDER BY ${sortField}
             LIMIT ?`,
            [limit]
        );

        if (files.length === 0) {
            console.log('No files found in database.');
            return;
        }

        const table = new Table({
            head: ['Path', 'Type', 'Lines', 'Size'],
            colWidths: [50, 10, 10, 12]
        });

        files.forEach(file => {
            table.push([
                file.path,
                file.file_type || 'N/A',
                file.lines_count || 0,
                `${((file.size_bytes || 0) / 1024).toFixed(1)} KB`
            ]);
        });

        console.log('\n📄 Files\n');
        console.log(table.toString());
        console.log(`\nShowing ${files.length} files (use --limit to show more)`);
    }

    /**
     * List functions in the database
     */
    async listFunctions(options) {
        const limit = this.validateLimit(options.limit || '20');
        const query = options.file
            ? `SELECT f.name, f.signature, f.is_exported, f.is_async, files.path
               FROM functions f
               JOIN files ON f.file_id = files.id
               WHERE files.path LIKE ?
               LIMIT ?`
            : `SELECT f.name, f.signature, f.is_exported, f.is_async, files.path
               FROM functions f
               JOIN files ON f.file_id = files.id
               ORDER BY f.name
               LIMIT ?`;

        const params = options.file ? [`%${options.file}%`, limit] : [limit];
        const functions = await this.db.query(query, params);

        if (functions.length === 0) {
            console.log('No functions found.');
            return;
        }

        const table = new Table({
            head: ['Function', 'Signature', 'Exported', 'Async', 'File'],
            colWidths: [25, 30, 10, 8, 40]
        });

        functions.forEach(func => {
            table.push([
                func.name,
                (func.signature || '').substring(0, 28),
                func.is_exported ? '✓' : '',
                func.is_async ? '✓' : '',
                func.path.substring(func.path.lastIndexOf('/') + 1)
            ]);
        });

        console.log('\n⚡ Functions\n');
        console.log(table.toString());
        console.log(`\nShowing ${functions.length} functions (use --limit to show more)`);
    }

    /**
     * Search the database
     */
    async search(term, options) {
        console.log(`\n🔍 Searching for: "${term}"\n`);

        const limit = this.validateLimit(options.limit || '10');
        const results = await this.db.fullTextSearch(term);

        if (results.files.length > 0) {
            console.log('📄 Files:');
            const table = new Table({
                head: ['Path', 'Purpose'],
                colWidths: [50, 60]
            });
            results.files.slice(0, limit).forEach(file => {
                table.push([file.path, file.purpose || 'N/A']);
            });
            console.log(table.toString());
        }

        if (results.functions.length > 0) {
            console.log('\n⚡ Functions:');
            const table = new Table({
                head: ['Function', 'File', 'Purpose'],
                colWidths: [25, 35, 50]
            });
            results.functions.slice(0, limit).forEach(func => {
                table.push([
                    func.name,
                    func.file_path.split('/').pop(),
                    func.purpose || 'N/A'
                ]);
            });
            console.log(table.toString());
        }

        if (results.files.length === 0 && results.functions.length === 0) {
            console.log('No results found.');
        }
    }

    /**
     * Show dependency graph
     */
    async dependencies(options) {
        const limit = this.validateLimit(options.limit || '20');
        const deps = await this.db.query(
            `SELECT from_file, to_file, dependency_type 
             FROM v_dependency_graph 
             LIMIT ?`,
            [limit]
        );

        if (deps.length === 0) {
            console.log('No dependencies found.');
            return;
        }

        const table = new Table({
            head: ['From', 'To', 'Type'],
            colWidths: [40, 40, 15]
        });

        deps.forEach(dep => {
            table.push([
                dep.from_file,
                dep.to_file || '(unresolved)',
                dep.dependency_type
            ]);
        });

        console.log('\n🔗 Dependencies\n');
        console.log(table.toString());
        console.log(`\nShowing ${deps.length} dependencies (use --limit to show more)`);
    }

    /**
     * Show complexity report
     */
    async complexity(options) {
        const repo = await this.db.queryOne(
            'SELECT id FROM repository_metadata ORDER BY last_updated DESC LIMIT 1'
        );

        if (!repo) {
            console.log('No repository data found.');
            return;
        }

        const report = await this.db.getComplexityReport(repo.id);

        if (report.length === 0) {
            console.log('No complexity data found.');
            return;
        }

        const table = new Table({
            head: ['File', 'Functions', 'File Complexity', 'Avg Function Complexity'],
            colWidths: [45, 12, 18, 25]
        });

        const limit = this.validateLimit(options.limit || '10');
        report.slice(0, limit).forEach(item => {
            table.push([
                item.path,
                item.function_count || 0,
                (item.file_complexity || 0).toFixed(2),
                (item.avg_function_complexity || 0).toFixed(2)
            ]);
        });

        console.log('\n📈 Complexity Report (Top Files)\n');
        console.log(table.toString());
    }

    /**
     * Export data to JSON
     */
    async exportData() {
        const repo = await this.db.queryOne(
            'SELECT * FROM repository_metadata ORDER BY last_updated DESC LIMIT 1'
        );

        if (!repo) {
            console.log('No repository data found.');
            return;
        }

        const files = await this.db.getAllFiles(repo.id);
        const deps = await this.db.getDependencyGraph(repo.id);
        const metrics = await this.db.getRepositoryMetrics(repo.id);

        const exportData = {
            repository: repo,
            files,
            dependencies: deps,
            metrics
        };

        console.log(JSON.stringify(exportData, null, 2));
    }

    /**
     * Backup database
     */
    async backup() {
        const fs = require('fs');
        const path = require('path');
        const backupDir = path.join(__dirname, '../backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `repo_backup_${timestamp}.db`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Validate path contains only safe characters
        if (!backupFile.match(/^[a-zA-Z0-9/_\-\.]+$/)) {
            throw new Error('Invalid backup file path');
        }
        
        // Additional check: ensure path is within expected directory
        const resolvedPath = path.resolve(backupFile);
        const expectedDir = path.resolve(backupDir);
        if (!resolvedPath.startsWith(expectedDir)) {
            throw new Error('Backup path must be within backups directory');
        }

        // Use SQLite backup API with proper path handling
        // VACUUM INTO requires a string literal, but we validate the path first
        const sanitizedPath = backupFile.replace(/'/g, "''"); // Escape single quotes
        await this.db.execute(`VACUUM INTO '${sanitizedPath}'`);
        
        console.log(`✓ Database backed up to: ${backupFile}`);
    }
}

// CLI Program
program
    .name('repo-db')
    .description('Repository Database Management CLI')
    .version('1.0.0');

program
    .command('stats')
    .description('Show database statistics')
    .option('-v, --verbose', 'Show detailed statistics')
    .action(async (options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.stats(options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('files')
    .description('List files in the database')
    .option('-l, --limit <number>', 'Limit number of results', '20')
    .option('-s, --sort <field>', 'Sort by field (path, lines_count, size_bytes)', 'path')
    .action(async (options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.listFiles(options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('functions')
    .description('List functions in the database')
    .option('-l, --limit <number>', 'Limit number of results', '20')
    .option('-f, --file <path>', 'Filter by file path')
    .action(async (options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.listFunctions(options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('search <term>')
    .description('Search files and functions')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .action(async (term, options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.search(term, options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('deps')
    .description('Show dependency graph')
    .option('-l, --limit <number>', 'Limit number of results', '20')
    .action(async (options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.dependencies(options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('complexity')
    .description('Show complexity report')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .action(async (options) => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.complexity(options);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('export')
    .description('Export database to JSON')
    .action(async () => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.exportData();
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program
    .command('backup')
    .description('Backup the database')
    .action(async () => {
        const cli = new DatabaseCLI();
        try {
            await cli.connect();
            await cli.backup();
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        } finally {
            await cli.close();
        }
    });

program.parse();
