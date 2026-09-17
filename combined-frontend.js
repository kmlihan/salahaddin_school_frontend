import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = 'combined-frontend.txt';

// File extensions to include
const includeExtensions = ['.js', '.jsx', '.css', '.html', '.json'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

const directories = [
    'src/api',
    'src/assets',
    'src/components',
    'src/context',
    'src/i18n',
    'src/pages',
    'src/utils'
];

const rootFiles = [
    'src/App.jsx',
    'src/index.css',
    'src/main.jsx',
    'index.html',
    'package.json',
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js'
];

let output = '';
let fileCount = 0;

function processFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const normalizedPath = filePath.replace(/\\/g, '/');
            
            output += `${normalizedPath}\n`;
            output += `${'='.repeat(80)}\n`;
            output += `${content}\n`;
            output += `${'='.repeat(80)}\n\n`;
            
            fileCount++;
            console.log(`✓ ${normalizedPath}`);
        }
    } catch (err) {
        console.error(`✗ Error: ${filePath} - ${err.message}`);
    }
}

function shouldInclude(filename) {
    return includeExtensions.some(ext => filename.endsWith(ext));
}

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    if (excludeDirs.some(exDir => dir.includes(exDir))) return;

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                scanDirectory(fullPath);
            } else if (entry.isFile() && shouldInclude(entry.name)) {
                processFile(fullPath);
            }
        });
    } catch (err) {
        console.error(`Error scanning ${dir}: ${err.message}`);
    }
}

console.log('🔍 Scanning frontend files...\n');

// Scan directories recursively
directories.forEach(dir => scanDirectory(dir));

// Process root files
rootFiles.forEach(file => processFile(file));

// Write output
fs.writeFileSync(outputFile, output);
const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(2);
console.log(`\n✅ Done! ${fileCount} files combined`);
console.log(`📄 Output: ${outputFile} (${fileSize} KB)`);