exports.command = 'vcs <command>';
exports.desc = 'Manage your version control system';
exports.builder = (yargs) => yargs.commandDir('vcs_cmds');
exports.handler = () => {};
