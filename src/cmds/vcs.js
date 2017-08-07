exports.command = 'vcs <command>';
exports.desc = 'Manage your VCS';
exports.builder = function (yargs) {
    return yargs.commandDir('vcs_cmds')
};
exports.handler = function (argv) {};
