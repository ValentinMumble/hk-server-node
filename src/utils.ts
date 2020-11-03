const hex2RGB = (hex: string): number[] => {
  const [, short, long] = String(hex).match(/^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i) ?? [];
  if (long) {
    const value = Number.parseInt(long, 16);
    return [value >> 16, (value >> 8) & 0xff, value & 0xff];
  } else {
    return Array.from(short, s => Number.parseInt(s, 16)).map(n => (n << 4) | n);
  }
};

const sanitize = (string: string) => string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export {hex2RGB, sanitize};
