exports.command = 'github <command>';
exports.desc = 'Manage your GitHub';
exports.builder = function (yargs) {
    return yargs.commandDir('github_cmds')
};
exports.handler = function (argv) {};
