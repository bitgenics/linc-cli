exports.command = 'slack <command>';
exports.desc = 'Manage your Slack';
exports.builder = (yargs) => yargs.commandDir('slack_cmds');
exports.handler = () => {};
