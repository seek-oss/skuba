// Hack to add a preamble from .changeset/.PREAMBLE.md to the CHANGELOG.md for a given release
/* eslint-disable no-sync */

const fs = require('fs');

const PREAMBLE_PATH = '.changeset/.PREAMBLE.md';
const CHANGELOG_PATH = 'CHANGELOG.md';

if (fs.existsSync(PREAMBLE_PATH) && fs.existsSync(CHANGELOG_PATH)) {
  const preamble = fs.readFileSync(PREAMBLE_PATH, 'utf8');
  const changeset = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  const lines = changeset.split('\n');
  lines.splice(3, 0, preamble);
  fs.writeFileSync(CHANGELOG_PATH, lines.join('\n'));
  fs.rmSync(PREAMBLE_PATH);
}
