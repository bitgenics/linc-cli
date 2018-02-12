const path = require('path')
const util = require('util')
const child_process = require('child_process')

const fse = require('fs-extra')
const readPkg = require('read-pkg')
const writePkg = require('write-pkg')
const semver = require('semver')

const initQuestions = require('./init-questions')

const getPackageJson = async () => {
  const packagePath = path.resolve('package.json')
  if (!await fse.pathExists(packagePath)) {
    throw new Error(
      'No package.json found. Initialise your project with (npm|yarn) init'
    )
  }
  const packageJson = await readPkg()
  packageJson.linc = packageJson.linc || {}
  return packageJson
}

const run = async () => {
  const packageJson = await getPackageJson()
  if(packageJson.linc.buildProfile) {
    const reset = await initQuestions.confirmReset()
    if(!reset) return
  }
  await installProfile(packageJson) 
}

const check = async () => {
  const packageJson = await getPackageJson()
  const buildProfile = await checkProfile(packageJson)
  return { packageJson, buildProfile }
}

const checkProfile = async packageJson => {
  let buildProfile = packageJson.linc.buildProfile
  if (!buildProfile || !packageJson.devDependencies[buildProfile]) {
    buildProfile = await installProfile(packageJson)
  }
  const buildProfileDir = path.resolve('node_modules', buildProfile)
  if (!await fse.pathExists(buildProfileDir)) {
    runInstall(buildProfile)
  }
  try {
    await checkProfileVersion(buildProfile)
  } catch (e) {}
  return buildProfile
}

const checkProfileVersion = async (buildProfile) => {
  const buildProfileDir = path.resolve('node_modules', buildProfile)
  const [profilePkg, latest] = await Promise.all([
    readPkg(buildProfileDir),
    getLatestVersion(buildProfile)
  ])
  if (semver.eq(latest, profilePkg.version)) {
    console.log(`Your version of ${buildProfile} is up-to-date`)
  } else if (semver.gt(latest, profilePkg.version)) {
    console.log(
      `Your version of '${buildProfile} is out of date. Installed '${
        profilePkg.version
      }', latest: '${latest}'`
    )
  }
}

const getLatestVersion = async buildProfile => {
  const exec = util.promisify(child_process.exec)
  const { stdout, stderr } = await exec(
    `npm view ${buildProfile} dist-tags.latest`
  )
  return stdout.trim()
}

const spawn = (cmd, args) => {
  console.log('Running: ', cmd, args.join(' '))
  return new Promise((resolve, reject) => {
    const subprocess = child_process.spawn(cmd, args, { stdio: 'inherit' })
    subprocess.on('error', err => {
      reject(err)
    })
    subprocess.on('close', code => {
      code === 0 ? resolve(code) : reject(`${cmd} exited with code: ${code}`)
    })
  })
}

const installProfile = async (packageJson) => {
  const currentProfile = packageJson.linc.buildProfile
  const buildProfile = await initQuestions.askProfile(currentProfile)
  packageJson.linc.buildProfile = buildProfile
  await writePkg(packageJson)
  await runInstall(buildProfile)
  return buildProfile
}

const runInstall = async (buildProfile) => {
  const yarn = fse.pathExists('./yarn.lock')
  if (yarn) {
    await spawn('yarn', ['add', buildProfile, '-D'])
  } else {
    await spawn('npm', ['install', buildProfile, '-D'])
  }
  
}

module.exports = { run, check }
