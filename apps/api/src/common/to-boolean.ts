import { Transform } from 'class-transformer';

/**
 * Safe boolean for ValidationPipe + enableImplicitConversion.
 * Prevents true→1 (then @IsBoolean fails and whitelist strips the field).
 */
export function ToBoolean() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true;
    }
    if (value === false || value === 0 || value === '0' || value === 'false') {
      return false;
    }
    return value;
  });
}
