exports.command = 'env <commmand>';
exports.desc = 'Manage your environments';
exports.builder = function (yargs) {
    return yargs.commandDir('env_cmds')
};
exports.handler = function (argv) {};
