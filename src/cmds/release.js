exports.command = 'release <command>';
exports.desc = 'Manage your releases';
exports.builder = function (yargs) {
    return yargs.commandDir('release_cmds')
};
exports.handler = function (argv) {};
