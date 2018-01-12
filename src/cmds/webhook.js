exports.command = 'webhook <command>';
exports.desc = 'Manage your webhooks';
exports.builder = (yargs) => yargs.commandDir('webhook_cmds');
exports.handler = () => {};
