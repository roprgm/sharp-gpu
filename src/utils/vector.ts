export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export function toVec3(
  value: number | Vec3 | Vec4 | undefined,
  fallback: number,
): Vec3 {
  if (Array.isArray(value)) {
    return [
      value[0] ?? fallback,
      value[1] ?? fallback,
      value[2] ?? fallback,
    ];
  }

  if (typeof value === "number") {
    return [value, value, value];
  }

  return [fallback, fallback, fallback];
}

export function toVec4(
  value: number | Vec3 | Vec4 | undefined,
  fallback: number,
  fallbackAlpha: number = fallback,
): Vec4 {
  if (Array.isArray(value)) {
    const [x, y, z, w] = value;
    return [
      x ?? fallback,
      y ?? fallback,
      z ?? fallback,
      w ?? fallbackAlpha,
    ];
  }

  if (typeof value === "number") {
    return [value, value, value, fallbackAlpha];
  }

  return [fallback, fallback, fallback, fallbackAlpha];
}

export function clampVec3Min(vec: Vec3, minValue: number): Vec3 {
  return [
    Math.max(vec[0], minValue),
    Math.max(vec[1], minValue),
    Math.max(vec[2], minValue),
  ];
}
