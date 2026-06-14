import { parseMultipartBoolean } from './parse-multipart-boolean';

describe('parseMultipartBoolean', () => {
  it('convertit les chaînes multipart', () => {
    expect(parseMultipartBoolean('true')).toBe(true);
    expect(parseMultipartBoolean('false')).toBe(false);
    expect(parseMultipartBoolean(' TRUE ')).toBe(true);
  });

  it('gère les tableaux multer', () => {
    expect(parseMultipartBoolean(['false', 'true'])).toBe(true);
  });
});
