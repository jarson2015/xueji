import { SetMetadata } from '@nestjs/common';

export const FORBID_PROXY_KEY = 'forbidProxy';

/** Block parent-proxy (代登) sessions from this handler. */
export const ForbidProxy = () => SetMetadata(FORBID_PROXY_KEY, true);
