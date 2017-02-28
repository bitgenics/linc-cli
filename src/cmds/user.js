exports.command = 'user <command>';
exports.desc = 'Manage your user settings';
exports.builder = function (yargs) {
  return yargs.commandDir('user_cmds')
};
exports.handler = function (argv) {};
