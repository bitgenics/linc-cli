exports.command = 'env <commmand>';
exports.desc = 'Manage your environments';
exports.builder = (yargs) => yargs.commandDir('env_cmds');
exports.handler = () => {};
