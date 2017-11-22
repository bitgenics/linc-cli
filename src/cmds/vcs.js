exports.command = 'vcs <command>';
exports.desc = 'Manage your version control system';
exports.builder = function (yargs) {
    return yargs.commandDir('vcs_cmds')
};
exports.handler = function (argv) {};
