const hex2RGB = str => {
  const [, short, long] = String(str).match(/^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i) || [];
  if (long) {
    const value = Number.parseInt(long, 16);
    return [value >> 16, (value >> 8) & 0xff, value & 0xff];
  } else if (short) {
    return Array.from(short, s => Number.parseInt(s, 16)).map(n => (n << 4) | n);
  }
};

/**
 * @param {string} uri
 */
const initResponse = uri => ({
  uri,
  status: 200,
  errors: [],
  results: [],
});

export {hex2RGB, initResponse};
