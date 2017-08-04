exports.command = 'bitbucket <command>';
exports.desc = 'Manage your Bitbucket';
exports.builder = function (yargs) {
    return yargs.commandDir('bitb_cmds')
};
exports.handler = function (argv) {};
