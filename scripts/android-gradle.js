/** android-gradle.js — cross-platform Gradle launcher for Android releases. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ANDROID = path.join(ROOT, 'android');
const mode = (process.argv[2] || 'all').toLowerCase();

const TASKS = {
  apk: ['assembleRelease'],
  aab: ['bundleRelease'],
  all: ['assembleRelease', 'bundleRelease']
};
if (!TASKS[mode]) {
  console.error('Usage: node scripts/android-gradle.js [apk|aab|all]');
  process.exit(1);
}

const wrapperJar = path.join(ANDROID, 'gradle', 'wrapper', 'gradle-wrapper.jar');
if (!fs.existsSync(wrapperJar)) throw new Error('Missing Gradle wrapper JAR: ' + wrapperJar);

const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
const java = process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', javaExe)
  : javaExe;

// Use a dedicated, writable temp directory. This avoids corrupt entries in a
// shared system temp folder on Windows while staying portable across machines.
const gradleTmp = path.join(os.tmpdir(), 'amaya-suite-gradle');
fs.mkdirSync(gradleTmp, { recursive: true });
const tmpPath = gradleTmp.replace(/\\/g, '/');
const jvmArgs = `-Xmx2048m -Djava.io.tmpdir=${tmpPath}`;

const args = [
  `-Djava.io.tmpdir=${tmpPath}`,
  '-classpath', wrapperJar,
  'org.gradle.wrapper.GradleWrapperMain',
  '-p', ANDROID,
  '--no-daemon',
  `-Dorg.gradle.jvmargs=${jvmArgs}`,
  ...TASKS[mode]
];

console.log(`  Gradle tasks: ${TASKS[mode].join(', ')}`);
execFileSync(java, args, { cwd: ROOT, stdio: 'inherit' });

execFileSync(process.execPath, [path.join(__dirname, 'collect-android.js'), mode], {
  cwd: ROOT,
  stdio: 'inherit'
});
