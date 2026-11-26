'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createOpenCloudSession } = require('../../src/main/services/open-cloud-session');

function mockFetch(t, implementation) {
  const original = global.fetch;
  global.fetch = implementation;
  t.after(() => {
    global.fetch = original;
  });
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('Open Cloud credentials stay on asset delivery API requests across redirects', async (t) => {
  const calls = [];
  mockFetch(t, async (url, options) => {
    calls.push({ url: String(url), headers: new Headers(options.headers) });
    if (calls.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://c0.rbxcdn.com/asset' },
      });
    }
    return new Response('content');
  });
  const session = createOpenCloudSession('test-key');
  await session.fetch('https://apis.roblox.com/asset-delivery-api/v1/assetId/123', {
    headers: { Cookie: 'must-not-leak', Authorization: 'must-not-leak' },
  });
  assert.equal(calls[0].headers.get('x-api-key'), 'test-key');
  assert.equal(calls[0].headers.get('Cookie'), null);
  assert.equal(calls[0].headers.get('Authorization'), null);
  assert.equal(calls[1].headers.get('x-api-key'), null);
  assert.equal(calls[1].headers.get('Cookie'), null);
});

test('Open Cloud refuses untrusted asset locations and redirects', async (t) => {
  const session = createOpenCloudSession('test-key');
  let requests = 0;
  mockFetch(t, async () => {
    requests += 1;
    return json({ location: 'https://roblox.com.attacker.example/asset' });
  });
  await assert.rejects(session.resolveAssetUrl('123'), /Blocked asset URL/);
  await assert.rejects(
    session.fetch('http://apis.roblox.com/asset-delivery-api/v1/assetId/123'),
    /Blocked asset URL/,
  );
  assert.equal(requests, 1);
  global.fetch = async () =>
    new Response(null, {
      status: 302,
      headers: { location: 'https://attacker.example/' },
    });
  await assert.rejects(session.fetch('https://c0.rbxcdn.com/asset'), /Blocked asset URL/);
});

test('Open Cloud reports permission failures with an explicit mode choice', async (t) => {
  mockFetch(t, async () => json({}, 403));
  await assert.rejects(
    createOpenCloudSession('test-key').resolveAssetUrl('123'),
    /403.*legacy-asset:manage.*explicitly choose Cookie mode/,
  );
});

// Exercise the regular run handler without launching Electron or accessing OS credentials.
let dataDirectory;
require.cache[require.resolve('electron')] = {
  loaded: true,
  exports: {
    app: { getPath: () => dataDirectory, getVersion: () => '1.3.20' },
    dialog: {},
    ipcMain: {},
    shell: {},
    nativeImage: {},
    Notification: { isSupported: () => false },
  },
};
require.cache[require.resolve('keytar')] = {
  loaded: true,
  exports: {
    findPassword: () => {
      throw new Error('Cookie access forbidden in API mode');
    },
  },
};
const auth = require('../../src/main/services/auth');
let cookieReads = 0;
auth.getCookieFromAutoDetect = async () => {
  cookieReads += 1;
  return 'legacy-cookie';
};
const {
  __private: { handleSpooferAction },
} = require('../../src/main/services/ipc-handlers');
const {
  __private: { handleScanPayload },
} = require('../../src/main/services/localhost-plugin-server');

for (const destination of ['user', 'group', 'download']) {
  const downloadOnly = destination === 'download';
  test(`API-key run completes for ${destination} without a cookie`, async (t) => {
    dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ispoofer-api-run-'));
    t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));
    const calls = [];
    mockFetch(t, async (value, options = {}) => {
      const url = String(value);
      const headers = new Headers(options.headers);
      calls.push(url);
      assert.equal(headers.get('Cookie'), null);
      assert.doesNotMatch(
        url,
        /ispoofermotion\.com|users\/authenticated|assetdelivery\.roblox\.com/,
      );
      if (url.endsWith('/assets/v1/assets/0')) return json({}, 404);
      if (url.includes('economy.roblox.com'))
        return json({
          Name: 'Walk',
          AssetTypeId: 24,
          Creator: { Id: 12345, CreatorType: 'User' },
        });
      if (url.includes('/asset-delivery-api/')) {
        assert.equal(headers.get('x-api-key'), 'test-key-with-sufficient-length');
        return json({ location: 'https://c0.rbxcdn.com/animation' });
      }
      if (url === 'https://c0.rbxcdn.com/animation') {
        assert.equal(headers.get('x-api-key'), null);
        return new Response(
          '<roblox version="4"><Item class="KeyframeSequence"><Properties /></Item></roblox>',
        );
      }
      if (url.endsWith('/assets/v1/assets') && options.method === 'POST') {
        assert.equal(headers.get('x-api-key'), 'test-key-with-sufficient-length');
        const request = JSON.parse(options.body.get('request'));
        assert.deepEqual(
          request.creationContext.creator,
          destination === 'group' ? { groupId: '54321' } : { userId: '12345' },
        );
        return json({ done: true, response: { assetId: '9999999' } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    let result;
    await handleSpooferAction(
      {
        authMode: 'apiKey',
        apiKey: 'test-key-with-sufficient-length',
        userId: '12345',
        groupId: destination === 'group' ? '54321' : '',
        robloxCookie: 'must-not-use',
        autoDetectCookie: true,
        animationId: '[1234567] [Walk] [User:12345] [Type:Animation]',
        downloadOnly,
        downloadFolder: path.join(dataDirectory, 'output'),
        desktopNotifications: false,
        downloadRetries: 1,
      },
      () => null,
      () => {},
      (value) => {
        result = value;
      },
      () => {},
      () => {},
      () => {},
    );
    assert.equal(cookieReads, 0);
    assert.equal(result.success, true);
    assert.equal(result.status, 'success');
    if (!downloadOnly) assert.match(result.output, /1234567 = 9999999/);
    assert.ok(calls.some((url) => url.includes('/asset-delivery-api/')));
    assert.equal(
      calls.some((url) => url.endsWith('/assets/v1/assets')),
      !downloadOnly,
    );
  });
}

test('Studio scan respects API-key mode without probing cookies', async (t) => {
  mockFetch(t, async (url, options) => {
    assert.match(String(url), /economy\.roblox\.com/);
    assert.equal(new Headers(options.headers).get('Cookie'), null);
    return json({
      AssetId: 1234567,
      Name: 'Walk',
      AssetTypeId: 24,
      Creator: { Id: 12345, CreatorType: 'User' },
    });
  });
  let finishScan;
  const scanFinished = new Promise((resolve) => {
    finishScan = resolve;
  });
  await handleScanPayload(
    { kind: 'animation', ids: ['1234567'], confirmedIds: ['1234567'] },
    {
      getAuthMode: async () => 'apiKey',
      sendStatusMessage: () => {},
      sendScanResults: finishScan,
    },
  );
  const result = await scanFinished;
  assert.equal(result.count, 1);
  assert.equal(cookieReads, 0);
});

test('Denied Open Cloud downloads finish with an error and never fall back to cookies', async (t) => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ispoofer-api-denied-'));
  t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));
  mockFetch(t, async (value) => {
    const url = String(value);
    if (url.includes('/asset-delivery-api/')) return json({}, 403);
    if (url.includes('economy.roblox.com')) return json({}, 404);
    if (url.includes('marketplace/productinfo')) return json({}, 404);
    throw new Error(`Unexpected request: ${url}`);
  });
  let result;
  const previousReads = cookieReads;
  await handleSpooferAction({
    authMode: 'apiKey', apiKey: 'test-key', autoDetectCookie: true, downloadOnly: true,
    downloadFolder: path.join(dataDirectory, 'output'),
    animationId: '[1234567] [Walk] [User:12345] [Type:Animation]',
  }, () => null, () => {}, (value) => { result = value; }, () => {}, () => {}, () => {});
  assert.equal(cookieReads, previousReads);
  assert.equal(result.success, false);
  assert.match(result.output, /403/);
});

test('Cookie mode retains auto-detection and validates the session', async (t) => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ispoofer-cookie-run-'));
  t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));
  mockFetch(t, async (url, options) => {
    assert.equal(String(url), 'https://users.roblox.com/v1/users/authenticated');
    assert.equal(new Headers(options.headers).get('Cookie'), '.ROBLOSECURITY=legacy-cookie');
    return json({}, 401);
  });
  let result;
  const previousReads = cookieReads;
  await handleSpooferAction(
    {
      authMode: 'cookie',
      autoDetectCookie: true,
      downloadOnly: true,
      downloadFolder: path.join(dataDirectory, 'output'),
      animationId: '[1234567] [Walk] [User:12345]',
    },
    () => null,
    () => {},
    (value) => {
      result = value;
    },
    () => {},
    () => {},
    () => {},
  );
  assert.equal(cookieReads, previousReads + 1);
  assert.equal(result.success, false);
  assert.match(result.output, /Cookie validation failed/);
});
