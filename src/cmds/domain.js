exports.command = 'domain <command>';
exports.desc = 'Manage your domains';
exports.builder = (yargs) => yargs.commandDir('domain_cmds');
exports.handler = () => {};
