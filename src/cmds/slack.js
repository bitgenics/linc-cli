exports.command = 'slack <command>';
exports.desc = 'Manage your Slack';
exports.builder = function (yargs) {
    return yargs.commandDir('slack_cmds')
};
exports.handler = function (argv) {};
