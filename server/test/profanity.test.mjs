import test from 'node:test';
import assert from 'node:assert/strict';
import { isProfane, nameProblem, nameKey, cleanName, NAME_MESSAGES } from '../src/profanity.js';

test('catches obscenities through disguises', () => {
  const bad = [
    'fuck', 'FuCk', 'f u c k', 'f.u.c.k', 'fu ck', 'fuuuuuck', 'xXfuckerXx', 'fück', 'ｆｕｃｋ',  // spacing, repeats, accents, full-width
    'sh1t', '5hit', '$h!t', 'b1tch', 'ѕhit',                                                     // leetspeak, Cyrillic ѕ
    'ass', 'dumb ass', 'a s s', 'tits', 'nazis', 'Shiiiit Head', 'cunt', 'pen1s', 'Dick',
  ];
  for (const s of bad) assert.equal(isProfane(s), true, s);
});

test('catches slurs', () => {
  // kept to a representative sample; the full list is in js/net/profanity.js
  for (const s of ['n1gger', 'Ñigga', 'faggot', 'retard', 'spic', 'kike']) assert.equal(isProfane(s), true, s);
});

test('does not flag innocent names (Scunthorpe problem)', () => {
  const ok = [
    'Scunthorpe', 'Essex', 'Sussex', 'class', 'Classic Player', 'assassin', 'Bass Player', 'Cocktail Party',
    'Dickens Fan', 'Dickinson', 'therapist', 'grape', 'Pakistan', 'Spice Girl', 'Spicer', 'Nazir', 'Raccoon',
    'Analyst', 'document', 'Title', 'Titanic', 'Cumbria', 'Arsenal', 'Peacock', 'Hancock', 'Mass Hitter',
    'Penistone', 'Shitake', 'Matsushita', 'Sextant', 'Mississippi', 'Uranus', 'Grasshopper', 'Jasmine', 'John R',
  ];
  for (const s of ok) assert.equal(isProfane(s), false, s);
});

test('nameProblem enforces length, characters and the filter', () => {
  assert.equal(nameProblem('ab'), 'short');
  assert.equal(nameProblem('  ab  '), 'short');
  assert.equal(nameProblem('a'.repeat(21)), 'long');
  assert.equal(nameProblem('a'.repeat(20)), null);
  assert.equal(nameProblem('John R'), null);
  assert.equal(nameProblem('Zoë_the-Explorer 7'), null);
  assert.equal(nameProblem('name!'), 'chars');
  assert.equal(nameProblem('<script>'), 'chars');
  assert.equal(nameProblem('___'), 'chars');
  assert.equal(nameProblem('123'), 'chars');
  assert.equal(nameProblem('Fuuuck you'), 'profane');
  assert.equal(nameProblem('Admin'), 'reserved');
  assert.equal(nameProblem('moderator 2'), 'reserved');
  assert.equal(nameProblem('Modest Mouse'), null);
  for (const code of ['short', 'long', 'chars', 'profane', 'reserved', 'taken']) assert.ok(NAME_MESSAGES[code]);
});

test('nameKey makes look-alike names collide', () => {
  assert.equal(nameKey('John_R'), nameKey('john r'));
  assert.equal(nameKey('Jöhn-R'), nameKey('JOHN R'));
  assert.notEqual(nameKey('John R'), nameKey('John B'));
  assert.equal(cleanName('  John    R  '), 'John R');
});
