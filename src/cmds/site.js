exports.command = 'site <command>';
exports.desc = 'Manage your site';
exports.builder = (yargs) => yargs.commandDir('site_cmds');
exports.handler = () => {};
