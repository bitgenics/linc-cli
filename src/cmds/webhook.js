exports.command = 'webhook <command>';
exports.desc = 'Manage your webhooks';
exports.builder = function (yargs) {
    return yargs.commandDir('webhook_cmds')
};
exports.handler = function (argv) {};
