import { fixtureBrute } from './donnees';

test('la fixture partagée est au format v2', () => {
  expect(fixtureBrute.version_schema).toBe(2);
  expect(fixtureBrute.collectifs).toHaveLength(11);
});

test('les tests tournent en heure de Paris', () => {
  expect(new Date('2026-10-13T14:41:53Z').getHours()).toBe(16);
});
