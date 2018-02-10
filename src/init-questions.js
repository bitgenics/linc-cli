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

const PUBLIC_PROFILES = [genericReactProfile, nextjsProfile]

const askProfile = async () => {
  const profileQuestion = {
    type: 'list',
    name: 'buildProfile',
    message: `
Linc uses different profiles to build & host different technology stacks. Pick the one closest to your technology stack.
For more information please see https://github.com/bitgenics/linc-cli`,
    choices: PUBLIC_PROFILES.concat({
      name: 'Custom - If you want to use your own (or a third-party) profile',
      value: '_custom'
    })
  }
  const customQuestion = {
    type: 'input',
    name: 'buildProfile',
    message: 'What is the full npm package name for the custom profile?',
    when: answers => answers.buildProfile === '_custom'
  }
  const answers = await inquirer.prompt([profileQuestion, customQuestion])
  return answers.buildProfile
}

module.exports = {askProfile}