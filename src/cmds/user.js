exports.command = 'user <command>';
exports.desc = 'Manage your user settings';
exports.builder = (yargs) => yargs.commandDir('user_cmds');
exports.handler = () => {};
