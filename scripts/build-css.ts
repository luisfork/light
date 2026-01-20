import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');
const cssDir = path.join(projectRoot, 'src', 'css');
const modulesDir = path.join(cssDir, 'modules');
const componentsDir = path.join(cssDir, 'components');

const hasModules = fs.existsSync(modulesDir);
const moduleFiles = hasModules
  ? fs
    .readdirSync(modulesDir)
    .filter((file: string) => file.endsWith('.css'))
    .sort()
    .map((file: string) => path.join(modulesDir, file))
  : [];

const hasComponents = fs.existsSync(componentsDir);
const componentFiles = hasComponents
  ? fs
    .readdirSync(componentsDir)
    .filter((file: string) => file.endsWith('.css'))
    .sort()
    .map((file: string) => path.join(componentsDir, file))
  : [];

// Build order: fonts → modules (base) → components → page styles
const sources = [
  path.join(cssDir, 'fonts.css'),
  ...moduleFiles,
  ...componentFiles,
  path.join(cssDir, 'styles.css'),
];

const concatenated = sources.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

const minified = concatenated
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([:;{},])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();

fs.writeFileSync(path.join(cssDir, 'bundle.css'), `${minified}\n`);

console.log(`bundle.css written (${sources.length} source file${sources.length === 1 ? '' : 's'})`);
