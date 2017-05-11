exports.command = 'site <command>';
exports.desc = 'Manage your site';
exports.builder = function (yargs) {
  return yargs.commandDir('site_cmds')
};
exports.handler = function (argv) {};
