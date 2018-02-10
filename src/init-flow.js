const path = require('path')
const spawn = require('child_process').spawn
const fse = require('fs-extra')
const readPkg = require('read-pkg')
const writePkg = require('write-pkg')
const initQuestions = require('./init-questions')

const run = async () => {
  await check()
}

const check = async () => {
  const packagePath = path.resolve('package.json')
  if (!await fse.pathExists(packagePath)) {
    throw new Error(
      'No package.json found. Initialise your project with (npm|yarn) init'
    )
  }
  const packageJson = await readPkg()
  const buildProfile = await checkProfile(packageJson)
  return { packageJson, buildProfile }
}

const checkProfile = async packageJson => {
  packageJson.linc = packageJson.linc || {}
  let buildProfile = packageJson.linc.buildProfile
  let installed = false
  if (!buildProfile) {
    buildProfile = await initQuestions.askProfile()
    packageJson.linc.buildProfile = buildProfile
    await writePkg(packageJson)
  }
  const buildProfileDir = path.resolve('node_modules', buildProfile)
  if(!await fse.pathExists(buildProfileDir)) {
    installProfile(buildProfile)
  }
}

const runCmd = (cmd, args) => {
  console.log('Running: ', cmd, args.join(' '));
  return new Promise((resolve, reject) => {
    const subprocess = spawn(cmd, args, {stdio: 'inherit'} );
    subprocess.on('error', (err) => {
        reject(err);
    });
    subprocess.on('close', (code) => {
        code === 0 ? resolve(code) : reject(`${cmd} exited with code: ${code}`);
    });
  });
}

const installProfile = async (buildProfile) => {
  const yarn = fse.pathExists('./yarn.lock')
  if(yarn) {
    await runCmd('yarn', ['add', buildProfile, '-D'])
  } else {
    await runCmd('npm', ['install', buildProfile, '-D'])
  }
}

module.exports = { run, check }
