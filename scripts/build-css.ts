import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');
const cssDir = path.join(projectRoot, 'src', 'css');
const modulesDir = path.join(cssDir, 'modules');

const hasModules = fs.existsSync(modulesDir);
const moduleFiles = hasModules
  ? fs
    .readdirSync(modulesDir)
    .filter((file: string) => file.endsWith('.css'))
    .sort()
    .map((file: string) => path.join(modulesDir, file))
  : [];

const sources =
  hasModules && moduleFiles.length > 0
    ? [path.join(cssDir, 'fonts.css'), ...moduleFiles, path.join(cssDir, 'styles.css')]
    : [path.join(cssDir, 'fonts.css'), path.join(cssDir, 'styles.css')];

const concatenated = sources.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

const minified = concatenated
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([:;{},])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();

fs.writeFileSync(path.join(cssDir, 'bundle.css'), `${minified}\n`);

console.log(`bundle.css written (${sources.length} source file${sources.length === 1 ? '' : 's'})`);
