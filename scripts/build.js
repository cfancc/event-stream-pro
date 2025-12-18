const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function build() {
    const rootDir = path.resolve(__dirname, '..');
    const distDir = path.join(rootDir, 'dist');
    const extensionDir = path.join(rootDir, 'extension');
    const panelDir = path.join(rootDir, 'panel');
    const panelDistDir = path.join(distDir, 'panel');

    console.log('Building EventStream Tools Extension...');

    // 1. Clean dist
    console.log('Cleaning dist directory...');
    await fs.emptyDir(distDir);

    // 2. Build Panel UI (React)
    console.log('Building React Panel...');
    execSync('npm install', { cwd: panelDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: panelDir, stdio: 'inherit' });

    // 3. Copy Extension Core Files
    console.log('Copying extension core files...');
    await fs.copy(extensionDir, distDir);

    // 4. Copy Panel Build to dist/panel
    console.log('Copying panel build...');
    const srcDist = path.join(panelDir, 'dist');
    await fs.copy(srcDist, panelDistDir);

    console.log('Build Complete! Load the "dist" folder in Chrome Extensions.');
}

build().catch(console.error);
