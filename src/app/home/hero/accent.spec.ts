import { parseAccent, parseHeadline } from './accent';

describe('parseAccent', () => {
  it('splits plain and accent segments', () => {
    expect(parseAccent('Motivated by *wonder*,')).toEqual([
      { text: 'Motivated by ', accent: false },
      { text: 'wonder', accent: true },
      { text: ',', accent: false },
    ]);
  });

  it('returns a single plain segment when there are no accents', () => {
    expect(parseAccent('to improve the world')).toEqual([
      { text: 'to improve the world', accent: false },
    ]);
  });
});

describe('parseHeadline', () => {
  it('splits authored lines on "|" and trims them', () => {
    const lines = parseHeadline(
      'Motivated by *wonder*, | and the deep desire | to improve the world',
    );
    expect(lines.length).toBe(3);
    expect(lines[1]).toEqual([{ text: 'and the deep desire', accent: false }]);
  });
});
