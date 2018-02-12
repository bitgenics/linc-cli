const inquirer = require('inquirer')

const genericReactProfile = {
  value: 'linc-profile-generic-react',
  name:
    'Generic React Application - A great starting point for any React application',
  description: 'A great starting point for any React application',
  short: 'Generic React Application',
  ssr: true,
  codesplit: true
}
const nextjsProfile = {
  value: 'linc-profile-nextjs',
  name: 'Next.js - A profile specific to Next.js applications.',
  short: 'Next.js',
  description: 'A profile specific to Next.js applications.',
  ssr: true,
  codesplit: true
}

const PROFILE_IDS = ['linc-profile-generic-react', 'linc-profile-nextjs']
const PUBLIC_PROFILES = [genericReactProfile, nextjsProfile]

const askProfile = async (currentProfile) => {
  const def = PROFILE_IDS.contains(currentProfile) ? currentProfile : '_custom'
  const profileQ = {
    type: 'list',
    name: 'buildProfile',
    default: currentProfile,
    message: `
Linc uses different profiles to build & host different technology stacks. Pick the one closest to your technology stack.
For more information please see https://github.com/bitgenics/linc-cli`,
    choices: PUBLIC_PROFILES.concat({
      name: 'Custom - If you want to use your own (or a third-party) profile',
      value: '_custom'
    })
  }
  const customQ = {
    type: 'input',
    name: 'buildProfile',
    default: currentProfile,
    message: 'What is the full npm package name for the custom profile?',
    when: answers => answers.buildProfile === '_custom'
  }
  const answers = await inquirer.prompt([profileQ, customQ])
  return answers.buildProfile
}

const confirmReset = async () => {
  const resetQ = {
    type: 'confirm',
    name: 'reset',
    message: 'You already have configured linc. Do you want to reconfigure?',
    default: false
  }
  const answers = await inquirer.prompt([resetQ])
  return answers.reset
}
module.exports = { askProfile, confirmReset }
