import { log } from '../../utils/logging.js';

export const logInitHelp = () => {
  log.plain(log.bold('skuba init'));
  log.newline();
  log.plain(
    'Creates a new local project from a starter template, or resumes templating.',
  );
  log.newline();
  log.plain(
    'Shows an interactive form on a TTY; otherwise reads JSON config from stdin.',
  );
  log.newline();
  log.plain(log.bold('Usage'));
  log.plain('  skuba init [--debug] [--non-interactive]');
  log.newline();
  log.plain(log.bold('Options'));
  log.plain('  --debug              Enable debug console output.');
  log.plain(
    '  --non-interactive    Read JSON config from stdin instead of prompting.',
  );
  log.plain(
    '                       Run with no input to print the expected JSON Schema.',
  );
  log.plain('  --help, -h           Show this help text.');
  log.newline();
  log.plain(log.bold('Resuming templating'));
  log.plain(
    'Running `skuba init` inside a project with a `skuba.template.js` in its root',
  );
  log.plain('resumes templating its remaining fields.');
};
