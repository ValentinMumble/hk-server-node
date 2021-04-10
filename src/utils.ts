const hex2RGB = (hex: string): number[] => {
  const [, short, long] = String(hex).match(/^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i) ?? [];
  if (long) {
    const value = Number.parseInt(long, 16);
    return [value >> 16, (value >> 8) & 0xff, value & 0xff];
  } else {
    return Array.from(short, s => Number.parseInt(s, 16)).map(n => (n << 4) | n);
  }
};

const RGB2XY = ([red, green, blue]: number[]): number[] => {
  red = red > 0.04045 ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : red / 12.92;
  green = green > 0.04045 ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : green / 12.92;
  blue = blue > 0.04045 ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : blue / 12.92;
  //RGB values to XYZ using the Wide RGB D65 conversion formula
  const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z = red * 0.000088 + green * 0.07231 + blue * 0.986039;
  //Calculate the xy values from the XYZ values
  let x = Number((X / (X + Y + Z)).toFixed(4));
  let y = Number((Y / (X + Y + Z)).toFixed(4));
  if (isNaN(Number(x))) {
    x = 0;
  }
  if (isNaN(Number(y))) {
    y = 0;
  }

  return [x, y];
};

const hex2XY = (hex: string): number[] => RGB2XY(hex2RGB(hex));

const sanitize = (string: string) => string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export {hex2RGB, sanitize, RGB2XY, hex2XY};
