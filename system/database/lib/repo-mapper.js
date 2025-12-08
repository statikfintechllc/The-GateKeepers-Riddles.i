#!/usr/bin/env node
/**
 * Repository Mapper - AI-Powered Code Analysis Tool
 * 
 * This tool performs comprehensive analysis of the repository:
 * - Scans all code files (JavaScript, HTML, CSS)
 * - Extracts functions, classes, and dependencies
 * - Calculates complexity metrics
 * - Builds dependency graphs
 * - Generates documentation and JSON artifacts
 */

const RepositoryDatabase = require('./database');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class RepositoryMapper {
    constructor(repoPath, dbPath = null, repoOwner = null, repoName = null, repoUrl = null) {
        this.repoPath = path.resolve(repoPath);
        this.db = new RepositoryDatabase(dbPath);
        
        // If repoOwner, repoName, repoUrl are not provided, try to auto-detect from git config
        if (!repoOwner || !repoName || !repoUrl) {
            try {
                // Get remote origin URL
                const gitUrl = execSync('git config --get remote.origin.url', { cwd: this.repoPath, encoding: 'utf8' }).trim();
                this.repoUrl = repoUrl || gitUrl;
                // Parse owner and name from URL
                // Supports both git@github.com:owner/name.git and https://github.com/owner/name(.git)
                const match = gitUrl.match(/[:\/]([^\/:]+)\/([^\/\.]+)(?:\.git)?$/);
                if (match) {
                    this.repoOwner = repoOwner || match[1];
                    this.repoName = repoName || match[2];
                } else {
                    this.repoOwner = repoOwner || 'statikfintechllc';
                    this.repoName = repoName || 'The-GateKeepers-Riddles.i';
                }
            } catch (e) {
                // Fallback to defaults
                this.repoOwner = repoOwner || 'statikfintechllc';
                this.repoName = repoName || 'The-GateKeepers-Riddles.i';
                this.repoUrl = repoUrl || 'https://github.com/statikfintechllc/The-GateKeepers-Riddles.i';
            }
        } else {
            this.repoOwner = repoOwner;
            this.repoName = repoName;
            this.repoUrl = repoUrl;
        }
        
        // Statistics
        this.stats = {
            filesScanned: 0,
            linesScanned: 0,
            functionsFound: 0,
            classesFound: 0,
            errorsCount: 0
        };

        // Ignore patterns
        this.ignorePatterns = [
            /node_modules/,
            /\.git\//,
            /\.github\/agents/,
            /dist\//,
            /build\//,
            /coverage\//,
            /\.min\./,
            /backups\//,
            /repo\.db/
        ];

        // Language mappings
        this.languageMap = {
            'js': 'JavaScript',
            'html': 'HTML',
            'css': 'CSS',
            'md': 'Markdown',
            'json': 'JSON',
            'yml': 'YAML',
            'yaml': 'YAML',
            'sh': 'Shell'
        };
    }

    /**
     * Main execution method
     */
    async run() {
        console.log('🗺️  Repository Mapper Starting...');
        console.log(`📁 Repository: ${this.repoPath}`);
        console.log('');

        try {
            // Connect to database
            console.log('🔌 Connecting to database...');
            await this.db.connect();
            
            // Get or create repository record
            console.log('📊 Setting up repository metadata...');
            this.repo = await this.db.getOrCreateRepository(
                this.repoOwner,
                this.repoName,
                this.repoUrl
            );
            
            // Start scan
            console.log('🚀 Starting repository scan...');
            this.scanId = await this.db.startScan(this.repo.id, 'full');
            
            // Scan the repository
            await this.scanRepository();
            
            // Calculate statistics
            await this.calculateStatistics();
            
            // Generate output files
            await this.generateOutputFiles();
            
            // Complete scan
            await this.db.completeScan(
                this.scanId,
                this.stats.filesScanned,
                this.stats.linesScanned,
                this.stats.errorsCount
            );
            
            console.log('');
            console.log('✅ Repository mapping completed successfully!');
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Error during repository mapping:', error);
            if (this.scanId) {
                await this.db.failScan(this.scanId);
            }
            throw error;
        } finally {
            await this.db.close();
        }
    }

    /**
     * Scan the repository and analyze all files
     */
    async scanRepository() {
        const files = await this.getAllFiles(this.repoPath);
        console.log(`📂 Found ${files.length} files to analyze`);
        console.log('');

        for (const filePath of files) {
            try {
                await this.analyzeFile(filePath);
            } catch (error) {
                console.error(`   ❌ Error analyzing ${filePath}: ${error.message}`);
                this.stats.errorsCount++;
            }
        }
    }

    /**
     * Get all files in the repository (recursively)
     */
    async getAllFiles(dir, fileList = []) {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const relativePath = path.relative(this.repoPath, filePath);
            
            // Check ignore patterns
            if (this.ignorePatterns.some(pattern => pattern.test(relativePath))) {
                continue;
            }

            const stat = await fs.stat(filePath);
            
            if (stat.isDirectory()) {
                await this.getAllFiles(filePath, fileList);
            } else {
                fileList.push(filePath);
            }
        }

        return fileList;
    }

    /**
     * Analyze a single file
     */
    async analyzeFile(filePath) {
        const relativePath = path.relative(this.repoPath, filePath);
        const ext = path.extname(filePath).slice(1);
        const name = path.basename(filePath);
        
        // Read file content
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);
        
        // Calculate hash
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        
        // Count lines
        const lines = content.split('\n');
        const lineCount = lines.length;
        
        // Analyze based on file type
        let fileType = this.languageMap[ext] || ext;
        let analysis = { codeLines: 0, commentLines: 0, blankLines: 0, complexity: 0, purpose: '' };
        
        if (ext === 'js') {
            analysis = await this.analyzeJavaScript(relativePath, content, lines);
        } else if (ext === 'html') {
            analysis = await this.analyzeHTML(relativePath, content, lines);
        } else if (ext === 'css') {
            analysis = await this.analyzeCSS(relativePath, content, lines);
        } else if (ext === 'md') {
            analysis = await this.analyzeMarkdown(relativePath, content);
        } else if (ext === 'json' || ext === 'yml' || ext === 'yaml') {
            analysis = await this.analyzeConfig(relativePath, content);
        }
        
        // Store file in database
        const fileData = {
            name: name,
            path: relativePath,
            file_type: fileType,
            extension: ext,
            size_bytes: stats.size,
            lines_count: lineCount,
            code_lines: analysis.codeLines,
            comment_lines: analysis.commentLines,
            blank_lines: analysis.blankLines,
            hash: hash,
            purpose: analysis.purpose,
            complexity_score: analysis.complexity
        };
        
        const fileId = await this.db.upsertFile(this.repo.id, fileData);
        
        // Store additional data (functions, classes, imports, exports)
        if (analysis.functions) {
            for (const func of analysis.functions) {
                await this.db.addFunction(fileId, func);
                this.stats.functionsFound++;
            }
        }
        
        if (analysis.imports) {
            for (const imp of analysis.imports) {
                await this.db.addImport(fileId, imp);
            }
        }
        
        if (analysis.exports) {
            for (const exp of analysis.exports) {
                await this.db.addExport(fileId, exp);
            }
        }
        
        // Build dependencies
        if (analysis.imports) {
            for (const imp of analysis.imports) {
                await this.addDependency(fileId, relativePath, imp);
            }
        }
        
        this.stats.filesScanned++;
        this.stats.linesScanned += lineCount;
        
        console.log(`   ✓ ${relativePath} (${lineCount} lines, ${analysis.functions ? analysis.functions.length : 0} functions)`);
    }

    /**
     * Analyze JavaScript file
     */
    async analyzeJavaScript(filePath, content, lines) {
        const result = {
            codeLines: 0,
            commentLines: 0,
            blankLines: 0,
            complexity: 0,
            purpose: '',
            functions: [],
            imports: [],
            exports: []
        };

        let inBlockComment = false;
        
        // Count line types
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '') {
                result.blankLines++;
            } else if (trimmed.startsWith('//')) {
                result.commentLines++;
            } else if (trimmed.startsWith('/*') || inBlockComment) {
                result.commentLines++;
                inBlockComment = true;
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
            } else {
                result.codeLines++;
            }
        }

        // Infer purpose from file path and content
        result.purpose = this.inferPurpose(filePath, content);

        // Extract functions
        result.functions = this.extractFunctions(content);
        
        // Calculate complexity (sum of all function complexities)
        result.complexity = result.functions.reduce((sum, f) => sum + f.complexity, 0);

        // Extract imports
        result.imports = this.extractImports(content);

        // Extract exports
        result.exports = this.extractExports(content);

        return result;
    }

    /**
     * Extract functions from JavaScript code
     */
    extractFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        const jsKeywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'else']);
        
        // Patterns for different function types
        const patterns = [
            // Standard function declaration: function name(...) {
            /^(\s*)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)/,
            // Arrow function: const name = (...) => 
            /^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\((.*?)\)\s*=>/,
            // Arrow function: const name = ... =>
            /^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/,
            // Method: name(...) {
            /^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*\{/,
            // Async function: async function name(...)
            /^(\s*)async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)/,
            // Async arrow: const name = async (...) =>
            /^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\((.*?)\)\s*=>/
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const isAsync = line.includes('async');
                    const isArrow = line.includes('=>');
                    const name = match[2];
                    
                    // Skip JavaScript keywords
                    if (jsKeywords.has(name)) {
                        continue;
                    }
                    
                    // Find end of function (simple heuristic: matching braces)
                    const lineEnd = this.findFunctionEnd(lines, i);
                    
                    // Calculate complexity
                    const functionCode = lines.slice(i, lineEnd + 1).join('\n');
                    const complexity = this.calculateComplexity(functionCode);
                    
                    // Infer purpose from function name and code
                    const purpose = this.inferFunctionPurpose(name, functionCode);
                    
                    // Check if exported
                    const isExported = this.isExported(lines, i, name);
                    
                    functions.push({
                        name: name,
                        signature: line.trim().replace(/\s+/g, ' '),
                        line_start: i + 1,
                        line_end: lineEnd + 1,
                        is_async: isAsync,
                        is_exported: isExported,
                        is_arrow_function: isArrow,
                        complexity: complexity,
                        purpose: purpose
                    });
                    
                    i = lineEnd; // Skip to the end of the function we just found
                    break;
                }
            }
        }

        return functions;
    }

    /**
     * Find the end line of a function (matching braces)
     * Note: This is a simple heuristic that counts braces. It may not handle
     * all edge cases correctly (e.g., braces in strings or comments). For more
     * accurate parsing, a proper JavaScript AST parser would be needed.
     */
    findFunctionEnd(lines, startLine) {
        let braceCount = 0;
        let foundFirstBrace = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundFirstBrace = true;
                } else if (char === '}') {
                    braceCount--;
                    if (foundFirstBrace && braceCount === 0) {
                        return i;
                    }
                }
            }
            
            // For arrow functions without braces
            if (i === startLine && line.includes('=>') && !line.includes('{')) {
                // Single line arrow function
                if (!line.trim().endsWith('(') && !line.trim().endsWith(',')) {
                    return i;
                }
            }
        }
        
        return startLine;
    }

    /**
     * Calculate cyclomatic complexity of code
     * Note: This is a regex-based approach that counts decision points. It may
     * count keywords/operators in strings or comments. For more accurate complexity
     * calculation, a proper JavaScript AST parser would be needed.
     */
    calculateComplexity(code) {
        let complexity = 1;
        
        // Count decision points
        const patterns = [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /&&/g,
            /\|\|/g,
            /\?/g
        ];
        
        for (const pattern of patterns) {
            const matches = code.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }

    /**
     * Check if a function is exported
     * Note: This uses simple string matching and may produce false positives
     * if export-like patterns appear in comments or strings. For more accurate
     * detection, a proper JavaScript AST parser would be needed.
     */
    isExported(lines, functionLine, functionName) {
        // Check if the function line itself has export
        if (lines[functionLine].includes('export')) {
            return true;
        }
        
        // Check for module.exports = functionName or exports.functionName
        for (let i = functionLine; i < Math.min(functionLine + 20, lines.length); i++) {
            const line = lines[i];
            if (line.includes(`module.exports`) || line.includes(`exports.${functionName}`)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Extract import statements
     */
    extractImports(content) {
        const imports = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // ES6 imports: import ... from '...'
            const es6Match = line.match(/import\s+(.+?)\s+from\s+['"](.+?)['"]/);
            if (es6Match) {
                const items = es6Match[1];
                const from = es6Match[2];
                const isExternal = !from.startsWith('.') && !from.startsWith('/');
                
                let importType;
                let importedItems = [];
                
                if (items.includes('{')) {
                    importType = 'named';
                    const match = items.match(/\{(.+?)\}/);
                    if (match) {
                        importedItems = match[1].split(',').map(s => s.trim());
                    }
                } else if (items.includes('*')) {
                    importType = 'namespace';
                    importedItems = [items.trim()];
                } else {
                    importType = 'default';
                    importedItems = [items.trim()];
                }
                
                imports.push({
                    imported_from: from,
                    imported_items: importedItems,
                    import_type: importType,
                    line_number: i + 1,
                    is_external: isExternal
                });
            }
            
            // CommonJS: require('...')
            const cjsMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"](.+?)['"]\)/);
            if (cjsMatch) {
                const items = cjsMatch[1];
                const from = cjsMatch[2];
                const isExternal = !from.startsWith('.') && !from.startsWith('/');
                
                let importedItems = [];
                if (items.includes('{')) {
                    const match = items.match(/\{(.+?)\}/);
                    if (match) {
                        importedItems = match[1].split(',').map(s => s.trim());
                    }
                } else {
                    importedItems = [items.trim()];
                }
                
                imports.push({
                    imported_from: from,
                    imported_items: importedItems,
                    import_type: 'default',
                    line_number: i + 1,
                    is_external: isExternal
                });
            }
        }
        
        return imports;
    }

    /**
     * Extract export statements
     */
    extractExports(content) {
        const exports = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // export default ...
            if (line.startsWith('export default')) {
                const match = line.match(/export\s+default\s+(.+?)(?:;|$)/);
                if (match) {
                    exports.push({
                        exported_name: match[1].trim(),
                        export_type: 'default',
                        line_number: i + 1,
                        ref_to: match[1].trim()
                    });
                }
            }
            
            // export { ... }
            else if (line.startsWith('export {')) {
                const match = line.match(/export\s+\{(.+?)\}/);
                if (match) {
                    const items = match[1].split(',').map(s => s.trim());
                    for (const item of items) {
                        exports.push({
                            exported_name: item,
                            export_type: 'named',
                            line_number: i + 1,
                            ref_to: item
                        });
                    }
                }
            }
            
            // export function/const/class ...
            else if (line.startsWith('export ')) {
                const match = line.match(/export\s+(?:function|const|let|var|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                if (match) {
                    exports.push({
                        exported_name: match[1],
                        export_type: 'named',
                        line_number: i + 1,
                        ref_to: match[1]
                    });
                }
            }
            
            // module.exports = ...
            else if (line.startsWith('module.exports')) {
                const match = line.match(/module\.exports\s*=\s*(.+?)(?:;|$)/);
                if (match) {
                    exports.push({
                        exported_name: match[1].trim(),
                        export_type: 'default',
                        line_number: i + 1,
                        ref_to: match[1].trim()
                    });
                }
            }
        }
        
        return exports;
    }

    /**
     * Add dependency between files
     */
    async addDependency(fromFileId, fromFilePath, importData) {
        const importPath = importData.imported_from;
        
        // Skip external dependencies for now
        if (importData.is_external) {
            await this.db.addDependency(fromFileId, null, 'import', importPath);
            return;
        }
        
        // Resolve relative path
        const fromDir = path.dirname(fromFilePath);
        let resolvedPath = path.join(fromDir, importPath);
        
        // Try different extensions
        const extensions = ['', '.js', '.json', '/index.js'];
        let toFileId = null;
        
        for (const ext of extensions) {
            const testPath = resolvedPath + ext;
            const toFile = await this.db.getFileByPath(this.repo.id, testPath);
            if (toFile) {
                toFileId = toFile.id;
                break;
            }
        }
        
        await this.db.addDependency(fromFileId, toFileId, 'import', importPath);
    }

    /**
     * Analyze HTML file
     */
    async analyzeHTML(filePath, content, lines) {
        const result = {
            codeLines: lines.length,
            commentLines: 0,
            blankLines: 0,
            complexity: 0,
            purpose: ''
        };
        
        let inBlockComment = false;
        
        // Count comments and blank lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') {
                result.blankLines++;
                continue;
            }

            let lineIsComment = false;
            let searchStart = 0;
            let tempLine = trimmed;

            // Handle multi-line and inline comments
            while (searchStart < tempLine.length) {
                if (!inBlockComment) {
                    const startIdx = tempLine.indexOf('<!--', searchStart);
                    if (startIdx === -1) {
                        break;
                    }
                    inBlockComment = true;
                    lineIsComment = true;
                    searchStart = startIdx + 4;
                }
                if (inBlockComment) {
                    const endIdx = tempLine.indexOf('-->', searchStart);
                    if (endIdx === -1) {
                        // Comment continues to next line
                        break;
                    } else {
                        inBlockComment = false;
                        lineIsComment = true;
                        searchStart = endIdx + 3;
                    }
                }
            }
            
            // If we are still in a block comment or found comment on this line, count it
            if (inBlockComment || lineIsComment) {
                result.commentLines++;
            }
        }
        
        // Calculate code lines
        result.codeLines = lines.length - result.blankLines - result.commentLines;
        
        // Infer purpose
        result.purpose = this.inferPurpose(filePath, content);
        
        return result;
    }

    /**
     * Analyze CSS file
     */
    async analyzeCSS(filePath, content, lines) {
        const result = {
            codeLines: lines.length,
            commentLines: 0,
            blankLines: 0,
            complexity: 0,
            purpose: ''
        };
        
        let inBlockComment = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') {
                result.blankLines++;
            } else if (trimmed.startsWith('/*') || inBlockComment) {
                result.commentLines++;
                inBlockComment = true;
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
            }
        }
        
        result.codeLines = lines.length - result.blankLines - result.commentLines;
        result.purpose = this.inferPurpose(filePath, content);
        
        return result;
    }

    /**
     * Analyze Markdown file
     */
    async analyzeMarkdown(filePath, content) {
        return {
            codeLines: content.split('\n').length,
            commentLines: 0,
            blankLines: 0,
            complexity: 0,
            purpose: this.inferPurpose(filePath, content)
        };
    }

    /**
     * Analyze configuration file
     */
    async analyzeConfig(filePath, content) {
        return {
            codeLines: content.split('\n').length,
            commentLines: 0,
            blankLines: 0,
            complexity: 0,
            purpose: this.inferPurpose(filePath, content)
        };
    }

    /**
     * Infer the purpose of a file based on its path and content
     */
    inferPurpose(filePath, content) {
        const fileName = path.basename(filePath).toLowerCase();
        const dirName = path.dirname(filePath);
        
        // Entry points
        if (fileName === 'index.html') return 'Main application entry point';
        if (fileName === 'game.js') return 'Core game logic and UI interactions';
        if (fileName === 'auth.js') return 'Authentication and user management';
        if (fileName === 'sw.js' || fileName.includes('service-worker')) return 'Service worker for PWA offline support';
        
        // Riddles
        if (filePath.includes('riddles/') && fileName.endsWith('.riddle.js')) {
            return 'Riddle definition file';
        }
        if (fileName === 'riddles.js') return 'Central riddle registry and loader';
        if (fileName === 'riddle.template.js') return 'Template for creating new riddles';
        
        // Styles
        if (fileName === 'game.css') return 'Complete game styling including animations and responsive design';
        
        // Configuration
        if (fileName === 'manifest.json') return 'PWA manifest configuration';
        if (fileName === 'package.json') return 'Node.js package configuration';
        if (fileName === '.gitignore') return 'Git ignore patterns';
        
        // Documentation
        if (fileName === 'readme.md') return 'Project documentation';
        if (dirName.includes('docs')) return 'Documentation file';
        
        // Database
        if (filePath.includes('database/')) {
            if (fileName === 'database.js') return 'Database access layer and API';
            if (fileName === 'migrate.js') return 'Database migration tool';
            if (fileName.includes('repo-db')) return 'Database CLI tool';
            if (fileName.endsWith('.sql')) return 'Database schema definition';
        }
        
        // Workflows
        if (filePath.includes('.github/workflows')) return 'GitHub Actions workflow';
        
        // Generic based on extension
        if (fileName.endsWith('.js')) return 'JavaScript module';
        if (fileName.endsWith('.html')) return 'HTML page';
        if (fileName.endsWith('.css')) return 'Stylesheet';
        if (fileName.endsWith('.md')) return 'Markdown documentation';
        
        return 'Repository file';
    }

    /**
     * Infer the purpose of a function
     */
    inferFunctionPurpose(name, code) {
        // Convert camelCase to words
        const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        
        // Common patterns
        if (name.startsWith('init')) return `Initializes ${words.replace('init ', '')}`;
        if (name.startsWith('get')) return `Retrieves ${words.replace('get ', '')}`;
        if (name.startsWith('set')) return `Sets ${words.replace('set ', '')}`;
        if (name.startsWith('create')) return `Creates ${words.replace('create ', '')}`;
        if (name.startsWith('delete') || name.startsWith('remove')) return `Removes ${words.replace(/delete |remove /, '')}`;
        if (name.startsWith('update')) return `Updates ${words.replace('update ', '')}`;
        if (name.startsWith('load')) return `Loads ${words.replace('load ', '')}`;
        if (name.startsWith('save')) return `Saves ${words.replace('save ', '')}`;
        if (name.startsWith('validate')) return `Validates ${words.replace('validate ', '')}`;
        if (name.startsWith('check')) return `Checks ${words.replace('check ', '')}`;
        if (name.startsWith('is')) return `Checks if ${words.replace('is ', '')}`;
        if (name.startsWith('has')) return `Checks if has ${words.replace('has ', '')}`;
        if (name.startsWith('handle')) return `Handles ${words.replace('handle ', '')} event`;
        if (name.startsWith('on')) return `Event handler for ${words.replace('on ', '')}`;
        if (name.includes('Event')) return `Event handler for ${words}`;
        
        // Look for comments above function
        const lines = code.split('\n');
        for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('*')) {
                const comment = line.replace(/^\/\/\s*/, '').replace(/^\*\s*/, '').trim();
                if (comment && comment.length > 10) {
                    return comment;
                }
            }
        }
        
        return `Function: ${words}`;
    }

    /**
     * Calculate repository statistics and update database
     */
    async calculateStatistics() {
        console.log('');
        console.log('📊 Calculating statistics...');
        
        // Get all files - use direct query instead of view
        const files = await this.db.query(
            'SELECT * FROM files WHERE repo_metadata_id = ?',
            [this.repo.id]
        );
        
        // Calculate language statistics
        const languageStats = {};
        let totalLines = 0;
        
        for (const file of files) {
            const lang = file.file_type || 'Unknown';
            if (!languageStats[lang]) {
                languageStats[lang] = { count: 0, lines: 0 };
            }
            languageStats[lang].count++;
            languageStats[lang].lines += file.lines_count || 0;
            totalLines += file.lines_count || 0;
        }
        
        // Store language stats
        for (const [lang, stats] of Object.entries(languageStats)) {
            await this.db.upsertLanguage(this.repo.id, {
                name: lang,
                file_count: stats.count,
                total_lines: stats.lines,
                percentage: totalLines > 0 ? (stats.lines / totalLines) * 100 : 0
            });
        }
        
        // Update repository totals
        await this.db.updateRepositoryStats(this.repo.id, files.length, totalLines);
    }

    /**
     * Generate output JSON files and documentation
     */
    async generateOutputFiles() {
        console.log('');
        console.log('📝 Generating output files...');
        
        const dataDir = path.join(this.repoPath, 'system/database/data');
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Generate repo-map.json
        await this.generateRepoMap(dataDir);
        
        // Generate code-index.json
        await this.generateCodeIndex(dataDir);
        
        // Generate metrics.json
        await this.generateMetrics(dataDir);
        
        // Generate ARCHITECTURE.md
        await this.generateArchitecture(dataDir);
    }

    /**
     * Generate repo-map.json
     */
    async generateRepoMap(dataDir) {
        console.log('   📄 Generating repo-map.json...');
        
        const files = await this.db.query(
            'SELECT * FROM files WHERE repo_metadata_id = ?',
            [this.repo.id]
        );
        const metrics = await this.db.getRepositoryMetrics(this.repo.id);
        const dependencies = await this.db.getDependencyGraph(this.repo.id);
        
        // Build directory structure
        const directories = new Set();
        const filesByPath = {};
        
        for (const file of files) {
            const dir = path.dirname(file.path);
            directories.add(dir);
            
            filesByPath[file.path] = {
                name: file.name,
                type: file.file_type,
                size: file.size_bytes,
                lines: file.lines_count,
                purpose: file.purpose,
                complexity: file.complexity_score
            };
        }
        
        // Build language map
        const languages = {};
        for (const lang of metrics.languages) {
            languages[lang.name] = {
                files: lang.file_count,
                lines: lang.total_lines,
                percentage: lang.percentage
            };
        }
        
        // Identify entry points
        const entryPoints = files
            .filter(f => f.name === 'index.html' || f.name === 'game.js' || f.name === 'sw.js')
            .map(f => ({
                file: f.path,
                type: f.name === 'index.html' ? 'main' : f.name === 'sw.js' ? 'worker' : 'module',
                purpose: f.purpose
            }));
        
        const repoMap = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '1.0.0',
                totalFiles: metrics.files.total_files,
                totalLines: metrics.files.total_lines,
                languages: languages
            },
            structure: {
                directories: Array.from(directories).sort(),
                entryPoints: entryPoints,
                dependencies: dependencies.length
            },
            files: filesByPath,
            relationships: {
                dependencies: dependencies.map(d => ({
                    from: d.from_file,
                    to: d.to_file,
                    type: d.dependency_type
                })),
                usedBy: this.buildUsedByMap(dependencies)
            },
            components: this.categorizeComponents(files),
            insights: this.generateInsights(files, dependencies, metrics)
        };
        
        fs.writeFileSync(
            path.join(dataDir, 'repo-map.json'),
            JSON.stringify(repoMap, null, 2)
        );
        
        console.log('   ✓ repo-map.json generated');
    }

    /**
     * Build "used by" map from dependencies
     */
    buildUsedByMap(dependencies) {
        const usedBy = {};
        
        for (const dep of dependencies) {
            if (!dep.to_file) continue;
            
            if (!usedBy[dep.to_file]) {
                usedBy[dep.to_file] = [];
            }
            usedBy[dep.to_file].push(dep.from_file);
        }
        
        return usedBy;
    }

    /**
     * Categorize files into components
     */
    categorizeComponents(files) {
        const components = {
            ui: [],
            logic: [],
            data: [],
            infrastructure: [],
            documentation: []
        };
        
        for (const file of files) {
            if (file.path.endsWith('.html') || file.path.endsWith('.css')) {
                components.ui.push(file.path);
            } else if (file.path.includes('riddles/') && file.path.endsWith('.riddle.js')) {
                components.data.push(file.path);
            } else if (file.path.endsWith('.js') && !file.path.includes('riddles/')) {
                components.logic.push(file.path);
            } else if (file.path.endsWith('.md')) {
                components.documentation.push(file.path);
            } else if (file.path.includes('.github/') || file.path.includes('database/')) {
                components.infrastructure.push(file.path);
            } else {
                components.infrastructure.push(file.path);
            }
        }
        
        return components;
    }

    /**
     * Generate insights from analysis
     */
    generateInsights(files, dependencies, metrics) {
        const insights = [];
        
        // Most complex files
        const complexFiles = files
            .filter(f => f.complexity_score > 0)
            .sort((a, b) => b.complexity_score - a.complexity_score)
            .slice(0, 3);
        
        if (complexFiles.length > 0) {
            insights.push({
                type: 'complexity',
                title: 'Most Complex Files',
                files: complexFiles.map(f => ({ path: f.path, score: f.complexity_score }))
            });
        }
        
        // Most connected files
        const connectionCounts = {};
        for (const dep of dependencies) {
            connectionCounts[dep.from_file] = (connectionCounts[dep.from_file] || 0) + 1;
        }
        
        const mostConnected = Object.entries(connectionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([file, count]) => ({ path: file, dependencies: count }));
        
        if (mostConnected.length > 0) {
            insights.push({
                type: 'connectivity',
                title: 'Most Connected Files',
                files: mostConnected
            });
        }
        
        // Largest files
        const largeFiles = files
            .sort((a, b) => b.lines_count - a.lines_count)
            .slice(0, 3)
            .map(f => ({ path: f.path, lines: f.lines_count }));
        
        insights.push({
            type: 'size',
            title: 'Largest Files',
            files: largeFiles
        });
        
        return insights;
    }

    /**
     * Generate code-index.json
     */
    async generateCodeIndex(dataDir) {
        console.log('   📄 Generating code-index.json...');
        
        const functions = await this.db.query(
            `SELECT f.*, files.path as file_path
             FROM functions f
             JOIN files ON f.file_id = files.id
             WHERE files.repo_metadata_id = ?`,
            [this.repo.id]
        );
        
        const exports = await this.db.query(
            `SELECT e.*, files.path as file_path
             FROM exports e
             JOIN files ON e.file_id = files.id
             WHERE files.repo_metadata_id = ?`,
            [this.repo.id]
        );
        
        const codeIndex = {
            functions: {},
            exports: {},
            lastUpdated: new Date().toISOString()
        };
        
        for (const fn of functions) {
            codeIndex.functions[fn.name] = {
                file: fn.file_path,
                line: fn.line_start,
                signature: fn.signature,
                purpose: fn.purpose,
                async: fn.is_async === 1,
                exported: fn.is_exported === 1,
                complexity: fn.complexity
            };
        }
        
        for (const exp of exports) {
            if (!codeIndex.exports[exp.exported_name]) {
                codeIndex.exports[exp.exported_name] = [];
            }
            codeIndex.exports[exp.exported_name].push({
                file: exp.file_path,
                line: exp.line_number,
                type: exp.export_type
            });
        }
        
        fs.writeFileSync(
            path.join(dataDir, 'code-index.json'),
            JSON.stringify(codeIndex, null, 2)
        );
        
        console.log('   ✓ code-index.json generated');
    }

    /**
     * Generate metrics.json
     */
    async generateMetrics(dataDir) {
        console.log('   📄 Generating metrics.json...');
        
        const metrics = await this.db.getRepositoryMetrics(this.repo.id);
        const complexity = await this.db.getComplexityReport(this.repo.id);
        const dependencies = await this.db.getDependencyReport(this.repo.id);
        
        const metricsOutput = {
            timestamp: new Date().toISOString(),
            repository: {
                name: this.repoName,
                owner: this.repoOwner,
                url: this.repoUrl
            },
            files: {
                total: metrics.files.total_files,
                totalLines: metrics.files.total_lines,
                totalCodeLines: metrics.files.total_code_lines,
                averageComplexity: Math.round(metrics.files.avg_complexity * 100) / 100
            },
            functions: {
                total: metrics.functions.total_functions,
                exported: metrics.functions.exported_functions,
                async: metrics.functions.async_functions,
                averageComplexity: Math.round(metrics.functions.avg_complexity * 100) / 100
            },
            languages: metrics.languages.map(l => ({
                name: l.name,
                files: l.file_count,
                lines: l.total_lines,
                percentage: Math.round(l.percentage * 100) / 100
            })),
            complexity: {
                topFiles: complexity.slice(0, 10).map(f => ({
                    path: f.path,
                    score: f.file_complexity,
                    functions: f.function_count
                }))
            },
            dependencies: {
                mostDependent: dependencies.slice(0, 10).map(f => ({
                    path: f.path,
                    outgoing: f.outgoing_deps,
                    incoming: f.incoming_deps
                }))
            }
        };
        
        fs.writeFileSync(
            path.join(dataDir, 'metrics.json'),
            JSON.stringify(metricsOutput, null, 2)
        );
        
        console.log('   ✓ metrics.json generated');
    }

    /**
     * Generate ARCHITECTURE.md
     */
    async generateArchitecture(dataDir) {
        console.log('   📄 Generating ARCHITECTURE.md...');
        
        const metrics = await this.db.getRepositoryMetrics(this.repo.id);
        const files = await this.db.query(
            'SELECT * FROM files WHERE repo_metadata_id = ?',
            [this.repo.id]
        );
        const dependencies = await this.db.getDependencyGraph(this.repo.id);
        const complexity = await this.db.getComplexityReport(this.repo.id);
        
        const components = this.categorizeComponents(files);
        
        let doc = `# Repository Architecture

Last Updated: ${new Date().toISOString()}
Generated by: Repo-Mapper Agent

## Overview

**The Gatekeeper's Riddle** - Interactive riddle game with PWA support

- **Total Files**: ${metrics.files.total_files}
- **Total Lines**: ${metrics.files.total_lines}
- **Primary Language**: JavaScript
- **Architecture**: Frontend web application with service worker

## High-Level Structure

\`\`\`
The-GateKeepers-Riddles.i/
├── index.html              # Main entry point
├── system/
│   ├── js/                # JavaScript modules
│   │   ├── game.js        # Core game logic
│   │   ├── auth.js        # Authentication
│   │   └── sw.js          # Service worker
│   ├── css/
│   │   └── game.css       # Complete styling
│   ├── riddles/           # Riddle definitions
│   │   ├── riddles.js     # Central registry
│   │   └── *.riddle.js    # Individual riddles
│   ├── database/          # Repository metadata system
│   └── storage/
│       └── manifest.json  # PWA configuration
├── docs/                  # Documentation
└── .github/               # Workflows and automation
\`\`\`

## Component Breakdown

### UI Layer
- **Files**: ${components.ui.length}
- **Purpose**: User interface and visual presentation

Key files:
${components.ui.slice(0, 5).map(f => `- ${f}`).join('\n')}

### Logic Layer
- **Files**: ${components.logic.length}
- **Purpose**: Application logic and business rules

Key files:
${components.logic.slice(0, 5).map(f => `- ${f}`).join('\n')}

### Data Layer
- **Files**: ${components.data.length}
- **Purpose**: Riddle content and data structures

Key files:
${components.data.slice(0, 5).map(f => `- ${f}`).join('\n')}

### Infrastructure
- **Files**: ${components.infrastructure.length}
- **Purpose**: Build tools, workflows, and configuration

### Documentation
- **Files**: ${components.documentation.length}
- **Purpose**: Project documentation and guides

## Entry Points

### Primary Entry Points
1. **index.html** → Loads game.js and game.css
2. **system/js/game.js** → Initializes application
3. **system/js/sw.js** → Registers service worker

## Dependency Graph

Total Dependencies: ${dependencies.length}

### Key Dependencies

${this.formatTopDependencies(dependencies)}

## File Statistics

### By Language
${metrics.languages.map(l => `- **${l.name}**: ${l.file_count} files (${Math.round(l.percentage)}%)`).join('\n')}

### By Category
- **UI Files**: ${components.ui.length}
- **Logic Files**: ${components.logic.length}
- **Data Files**: ${components.data.length}
- **Infrastructure**: ${components.infrastructure.length}
- **Documentation**: ${components.documentation.length}

## Complexity Analysis

### Most Complex Files
${complexity.slice(0, 10).map((f, i) => `${i + 1}. **${f.path}** (complexity: ${f.file_complexity}, functions: ${f.function_count})`).join('\n')}

### Function Distribution
- **Total Functions**: ${metrics.functions.total_functions}
- **Exported Functions**: ${metrics.functions.exported_functions}
- **Async Functions**: ${metrics.functions.async_functions}
- **Average Complexity**: ${Math.round(metrics.functions.avg_complexity * 100) / 100}

## Design Patterns

### Architecture Patterns
1. **Module Pattern**: Used throughout for encapsulation
2. **Registry Pattern**: riddles.js acts as central registry
3. **Observer Pattern**: Event listeners for UI interactions
4. **Service Worker Pattern**: Offline-first PWA

### Code Organization
- Separation of concerns (UI, logic, data)
- Modular structure with clear dependencies
- Template-based riddle creation

## Extension Points

### Adding New Riddles
1. Create new \`.riddle.js\` file using template
2. Register in \`riddles.js\`
3. Follow standardized format

### Adding New Features
- **UI Extensions**: Modify game.js and game.css
- **Data Extensions**: Extend riddle template
- **Infrastructure**: Add to workflows or database

## Database Schema

The repository uses a comprehensive SQLite database for metadata:

### Core Tables
- **repository_metadata**: Repository configuration
- **files**: File metadata and statistics (${metrics.files.total_files} entries)
- **functions**: Function definitions and metrics (${metrics.functions.total_functions} entries)
- **dependencies**: File-to-file dependencies (${dependencies.length} entries)
- **scan_history**: Audit trail of all scans

### Queries Available
- Full-text search across files and functions
- Dependency graph traversal
- Complexity reports
- Language statistics

## Maintenance

### Code Quality
- Average file complexity: ${Math.round(metrics.files.avg_complexity * 100) / 100}
- Average function complexity: ${Math.round(metrics.functions.avg_complexity * 100) / 100}

### Technical Debt
${this.identifyTechnicalDebt(complexity, metrics)}

---

*Generated by Repo-Mapper Agent using AI-powered code analysis*
*Database System: SQLite with full-text search (FTS5)*
`;
        
        fs.writeFileSync(path.join(dataDir, 'ARCHITECTURE.md'), doc);
        
        console.log('   ✓ ARCHITECTURE.md generated');
    }

    /**
     * Format top dependencies for documentation
     */
    formatTopDependencies(dependencies) {
        const depCounts = {};
        
        for (const dep of dependencies) {
            if (!dep.from_file) continue;
            depCounts[dep.from_file] = (depCounts[dep.from_file] || 0) + 1;
        }
        
        const top = Object.entries(depCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (top.length === 0) {
            return 'No dependencies found.';
        }
        
        return top.map(([file, count]) => `- **${file}** depends on ${count} other files`).join('\n');
    }

    /**
     * Identify technical debt
     */
    identifyTechnicalDebt(complexity, metrics) {
        const issues = [];
        
        // High complexity files
        const highComplexity = complexity.filter(f => f.file_complexity > 20);
        if (highComplexity.length > 0) {
            issues.push(`- ${highComplexity.length} files have high complexity (>20)`);
        }
        
        // Large files
        const largeFiles = complexity.filter(f => f.file_complexity > 50);
        if (largeFiles.length > 0) {
            issues.push(`- ${largeFiles.length} files are very large and may benefit from refactoring`);
        }
        
        if (issues.length === 0) {
            return 'No significant technical debt identified.';
        }
        
        return issues.join('\n');
    }

    /**
     * Print summary statistics
     */
    printSummary() {
        console.log('');
        console.log('📊 Summary:');
        console.log(`   Files Scanned: ${this.stats.filesScanned}`);
        console.log(`   Lines Scanned: ${this.stats.linesScanned}`);
        console.log(`   Functions Found: ${this.stats.functionsFound}`);
        console.log(`   Errors: ${this.stats.errorsCount}`);
        console.log('');
    }
}

// CLI execution
if (require.main === module) {
    const repoPath = process.argv[2] || process.cwd();
    const mapper = new RepositoryMapper(repoPath);
    
    mapper.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = RepositoryMapper;
