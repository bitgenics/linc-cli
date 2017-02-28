exports.command = 'site <command>';
exports.desc = 'Create and manage your LINC sites';
exports.builder = function (yargs) {
  return yargs.commandDir('site_cmds')
};
exports.handler = function (argv) {};
