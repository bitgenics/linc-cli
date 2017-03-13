exports.command = 'domain <command>';
exports.desc = 'Manage your domains';
exports.builder = function (yargs) {
    return yargs.commandDir('domain_cmds')
};
exports.handler = function (argv) {};
