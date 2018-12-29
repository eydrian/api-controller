import { isString } from './isString';

export function toNumber(value: string | number): number {
  return isString(value) ? parseInt(value, 10) : value;
}
