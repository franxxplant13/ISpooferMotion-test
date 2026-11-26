'use strict';

const ASSET_DELIVERY_BASE = 'https://apis.roblox.com/asset-delivery-api/v1/assetId/';

// Asset content URLs come from Roblox. Credentials belong only on the API
// request, never on CDN requests or their redirects.
function validateRobloxUrl(value) {
  const url = new URL(value);
  const allowedHost = ['roblox.com', 'rbxcdn.com'].some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
  if (url.protocol !== 'https:' || !allowedHost || url.username || url.password || url.port) {
    throw new Error('Blocked asset URL outside approved Roblox HTTPS hosts.');
  }
  return url;
}

function createOpenCloudSession(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('Open Cloud API key is required.');

  return {
    authType: 'apiKey',
    getCookieHeader: () => '',

    async fetch(value, options = {}) {
      let url = validateRobloxUrl(value);
      for (let redirects = 0; redirects <= 5; redirects += 1) {
        const headers = new Headers(options.headers || {});
        headers.delete('Cookie');
        headers.delete('Authorization');
        headers.delete('x-api-key');
        if (
          url.origin === 'https://apis.roblox.com' &&
          url.pathname.startsWith('/asset-delivery-api/')
        ) {
          headers.set('x-api-key', key);
        }
        const response = await fetch(url, {
          ...options,
          headers,
          redirect: 'manual',
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) return response;
        const location = response.headers.get('location');
        if (!location) throw new Error('Asset redirect is missing its destination.');
        url = validateRobloxUrl(new URL(location, url));
      }
      throw new Error('Too many asset redirects.');
    },

    async resolveAssetUrl(assetId, options = {}) {
      if (!/^\d+$/.test(String(assetId))) throw new Error('Invalid asset ID.');
      const response = await this.fetch(`${ASSET_DELIVERY_BASE}${assetId}`, {
        ...options,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const hint =
          response.status === 403
            ? ' Check Asset Delivery permissions (legacy-asset:manage) and access to this asset. You can explicitly choose Cookie mode for the existing workflow.'
            : '';
        const error = new Error(`Open Cloud asset delivery failed (${response.status}).${hint}`);
        error.nonRetryable = [400, 401, 403, 404].includes(response.status);
        throw error;
      }
      const body = await response.json();
      const location = body.location || body.locations?.[0]?.location;
      if (!location) throw new Error('Open Cloud returned no downloadable asset location.');
      return validateRobloxUrl(location).toString();
    },
  };
}

module.exports = { createOpenCloudSession };
