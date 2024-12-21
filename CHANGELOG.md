# Changelog

## v6.0.9 (2024/11/15)

### Features
* [Unfinished]:**Cache:** Changed to export the `Cache` class so that the currently cached data can be retrieved.
```ts
import { YtdlCore, Cache } from '@ybd-project/ytdl-core';

const ytdl = new YtdlCore();

Cache.get('oauth2').then((cache: object | null) => {
    ytdl.getFullInfo('VIDEO_URL', {
        oauth2Credentials: cache,
    });
});
```

### Change
* **Request:** Changed to change the domain to which the request is made if the request fails. (Usually use the domain `youtube.com`, but change to `youtubei.googleapis.com` if request to this domain fails)

### Bug Fixes
* **Clients:** Fixed a problem in which `[ WARNING ]: At least one client must be specified.` was output even though the option was successfully specified.
* **Stream:** Fixed ReadableStream not existing on Glitch server (https://github.com/ybd-project/ytdl-core/issues/35)
* [Unfinished]:**Download:** Fixed video incompatibility issue (https://github.com/ybd-project/ytdl-core/issues/34)

## v6.0.8 (2024/11/13)

### Change
* **YtdlCore:** Change user from `ybd-project-ver1` to `ybd-project`

## v6.0.7 (2024/11/13)

### Bug Fixes
* **YtdlCore:** Fixed a bug where the `acorn` package did not exist.

## v6.0.6 (2024/11/02)

### Features
* **URL Decipherment:** Added HTML5 player related options (see below for details).
```ts
new YtdlCore({
    html5Player: {
        /* It is taken from the html5 player fallback on Github and is automatically updated 6 times a day.
        * Note: If this option is enabled, Base.js is not retrieved, only the function is retrieved.
        * */
        useRetrievedFunctionsFromGithub: true,
    }
});
```
* **VideoFormat:** Added static function `toVideoFormats` to YtdlCore instance to convert `YT_StreamingAdaptiveFormat` to `YTDL_VideoFormat`.

### Changes
* **URL Decipherment:** Change to extract the decoding function and the N conversion function when the HTML5 player is acquired.

## v6.0.5 (2024/10/28)

### Features
* **URL Decipherment:** Add static function `decipherFormat` to YtdlCore instances.
* **OAuth2:** Add static function `createOAuth2Credentials` to YtdlCore instances.
* **Request:** Add option `disableRetryRequest`.

### Changes
* **Download URL:** Changed to output to debug log which URL is being requested when downloading
* **Default Client:** Changed default client from `['web', 'webCreator', 'tvEmbedded', 'ios', 'android']` to `['web', 'mweb', 'tv', 'ios']`.
* **Request:** Changed to request again without specifying OriginalProxy or OAuth2 if request fails in order to increase possibility of information retrieval.

### Abolition
* **Version Check:** The browser version check function has been discontinued.
* **DASH Format:** Removed parsing function because DASH format is not included in any client
* **Stream Type:** The `streamType` option is obsolete and can be converted by importing the `toPipeableStream` function instead. (Default or Serverless version only)
```ts
import { YtdlCore, toPipeableStream } from '@ybd-project/ytdl-core';

/* Or */

import { YtdlCore, toPipeableStream } from '@ybd-project/ytdl-core/serverless';
```

### Bug Fixes
* **YtdlCore:** Various bugs fixed

### Improvement
* **YtdlCore:** Remove unnecessary packages and reduce package size.

## v6.0.4 (2024/10/16)

### Bug Fixes
* **Jinter:** Stop log output of internally used Jinter

## v6.0.3 (2024/10/14)

### Bug Fixes
* **ReadableStream:** Fixed stream-related TypeError.
* **Browser Check:** Corrected browser confirmation behavior

### Change
* **PoToken:** Updated the version of the BgUtils package.

## v6.0.2 (2024/10/11)

### Change
* **PoToken:** Updated the version of the BgUtils package.

### Bug Fixes
* **NTransform:** Fixed regular expression for NTransform analysis.
* **Header API:** Fixed an issue where Headers could not be used with Node.js v16.

## v6.0.1 (2024/10/06)

### Features
* **Error:** Changed all Player APIs to include the iOS client's playabilityStatus when they return an error.

## v6.0.0 (2024/10/06).

### Features
* **YtdlCore:** Support for use in browsers. (To use, import `@ybd-project/ytdl-core/browser`)
* **YtdlCore:** Added a processing-optimized YtdlCore for deployment to serverless functions such as Vercel Functions. (just use `@ybd-project/ytdl-core/serverless` when importing)
* **YtdlCore:** Changed to be able to import types used in YtdlCore. (To use, import `@ybd-project/ytdl-core/types`)
* **YtdlCore:** Static methods such as the `getFullInfo` function have been eliminated in view of optional adaptations, etc.
* **Stream:** Added option `streamType` to specify the type of stream to receive (ReadableStream or Readable (for Node.js)) in `download` functions, etc. (The type specification of the stream is done as follows)
```ts
import { YtdlCore, YTDL_NodejsStreamType } from '@ybd-project/ytdl-core';

const ytdl = new YtdlCore({
    streamType: 'nodejs',
});

ytdl.download<YTDL_NodejsStreamType>('https://www.youtube.com/watch?v=ID', { filter: 'audioandvideo' }).then((stream) => {
    // If the default (ReadableStream), it cannot be piped.
    stream.pipe(fs.createWriteStream(process.cwd() + '/results/video.mp4'));
});

// If not Node.js, import `YTDL_DefaultStreamType`.
import { YtdlCore, YTDL_DefaultStreamType } from '@ybd-project/ytdl-core';

const ytdl = new YtdlCore({
    streamType: 'default',
});

ytdl.download<YTDL_DefaultStreamType>('https://www.youtube.com/watch?v=ID', { filter: 'audioandvideo' }).then((stream) => {
    ...
});
```

### Changes
* **Lang:** Remove the `lang` option and add the `hl` option.
* **Country:** Add `gl` option.
* **Debug:** Eliminated the use of the `YTDL_DEBUG` environment variable. (For debug log display, use the `logDisplay` option instead.)
* **Log:** Added `logDisplay` option to specify the type of log to display.
* **Options:** The `requestOptions` option is obsolete.
* **Request:** Eliminate the use of the internal Undici package.
* **Fetcher:** Add `fetcher` option to control requests. (Allows proxy adaptation, etc. (returns a Response object))
* **Agent:** Proxy adaptation to requests by YtdlCore has been discontinued due to specification issues.
* **PoToken:** Stop using `youtube-po-token-generator` to generate PoToken, and use [`LuanRT/BgUtils`](https://github.com/LuanRT/BgUtils) instead, because it cannot generate PoToken correctly. (Experimental, not available in the browser and serverless versions)
* **Player:** To improve the stability of obtaining player IDs, the following two things were implemented.
    1. If it could not be retrieved, ytdl-core retrieve the latest player ID from GitHub ([api.github.com/repos/ybd-project/ytdl-core/contents/data/player/data.json?ref=dev](https://api.github.com/repos/ybd-project/ytdl-core/contents/data/player/data.json?ref=dev)) to get the latest player ID. **(This JSON is updated every day.)**
    2. If the player ID could not be obtained from GitHub, the latest player ID at that time obtained at build time is used.
* **VideoDetails:** Added `playabilityStatus` to video details. The value `OK` takes precedence.
* **Cache:** Added `disableBasicCache` option to disable basic cache.
* **Version:** Added `disableVersionCheck` option to disable version check (In `@ybd-project/ytdl-core`, the Node.js version and browser version are checked).

### Bug Fixes
* **Types:** Fixed wrong type issue.
* **README:** Fixed incorrect README documentation.

### Improvement
* **YtdlCore:** Remove unnecessary packages and reduce package size.

## v5.1.9, v5.1.9-2 (2024/09/22)

### Features
* **PoToken:** Added option `disablePoTokenAutoGeneration` to disable automatic generation of PoToken

### Bug Fixes
* **Bug:** Minor bug fixes

## v5.1.8 (2024/09/20)

### Features
* **Proxy:** Add `originalProxy` option.
* **Client:** With the addition of `WEB_EMBEDDED` in LuanRT/YouTube.js, ytdl-core also supports it

### Bug Fixes
* **VideoInfo:** Fixed issue with publish date not being included in video details

### Improvement
* **YtdlCore:** Overall improvements in performance, code, etc.

### Deprecated
* **Proxy:** The `originalProxyUrl` option has been rewritten to the `originalProxy` option due to lack of convenience of use.

## v5.1.7 (2024/09/18)

### Features
* **Proxy:** Add `originalProxyUrl` option.
* **M3U8:** Add `parsesHLSFormat` option. (Rename `notParsingHLSFormat`)

## v5.1.6 (2024/09/15)

### Features
* **Format Selection:** Changed to determine if the download URL is correct. (To address https://github.com/ybd-project/ytdl-core/issues/21)

## v5.1.5 (2024/09/14)

### Features
* **OAuth2:** Changed OAuth2 to test whether tokens can be used successfully. If not, disable the token.
* **Version:** Changed to check Node.js version; If Node.js is less than 16, the process will terminate due to an error.

### Improvement
* **Error:** Improved error handling, etc.

## v5.1.4 (2024/09/12)

### Bug Fixes
* **Syntax:** Fixed problem with "??=" still remaining.

## v5.1.3 (2024/09/12)

### Features
* **Cache:** Add `disableFileCache` option. (Specify if an error occurs in the file cache.)
* **M3U8:** Supports HLS formats that can be retrieved from IOS clients.
* **M3U8:** Add `notParsingHLSFormat` option. (do not parse HLS format)

### Bug Fixes
* **Syntax:** Fixed a problem in which the "??=" syntax caused errors in certain environments.
* **Fetch:** Fixed "ReferenceError: fetch is not defined" problem in certain environments

## v5.1.2 (2024/09/11)

### Features
* **Cache:** Cache PoToken, VisitorData, OAuth2 credentials, and htm5player data. (Data is stored in the CacheFiles directory in /package/core/)
* **Download:** Send a HEAD request to the download URL to determine if it is available.

### Changes
* **Format Selection:** Rename `filteringClients` to `excludingClients`.

### Improvement
* **Log:** Improved log output.

## v5.1.1 (2024/09/09)

### Features
* **Format Selection:** Added option `filteringClients` to filter format data by client name

### Bug Fixes
* **Log:** Fixed problem with incorrect indentation in success log

### Improvement
* **YtdlCore:** Improved option specification for YtdlCore classes
* **Format Selection:** Improved to exclude video URLs (audio URLs) from web clients unless specified with the `filteringClients` option since they return 403

## v5.1.0 (2024/09/09)

### Features
* **Operation:** Next API (/youtubei/v1/next) to stabilize the operation.
* **Request:** Refer to (https://github.com/distubejs/ytdl-core/pull/105)[https://github.com/distubejs/ytdl-core/pull/105] and add the `rewriteRequest` option

### Changes
* **YtdlCore:** YtdlCore is now a class so that options can be specified in a unified manner.

### Bug Fixes
* **OAuth2:** Fixed problem with updating OAuth2 tokens
* **Info:** Fixed to be able to retrieve channel subscribers and whether the channel is verified.

### Improvement
* **Performance:** Improved operating performance
* **Types:** Improved TypeScript type specification

### Deprecated
* **Traditional Use:** Traditional usage has been deprecated. Please use the new usage, YtdlCore class. See the API documentation for details.

## v5.0.17 (2024/09/07)

### Features
* **Clients:** Change supported clients to only those that work properly
* **OAuth2:** OAuth2 support

### Bug Fixes
* **Player:** Improved implementation of Player API to reduce errors (when specifying PoToken or OAuth2)

### Deprecated
* **getInfo:** The getInfo function has been deprecated. Please use the getFullInfo function instead. (The getInfo function can be used until v5.2.x.)

## v5.0.13, v5.0.14 (2024/09/05)

### Features
* **Log:** Changed to be able to check the status of the player API. (Specify `YTDL_DEBUG` in the environment variable)

### Bug Fixes
* **Player:** Fixed an issue where player API URLs for Android and iOS players were not set correctly

## v5.0.9, v5.0.9-2, v5.0.10, v5.0.11, v5.0.12 (2024/08/21)

### Bug Fixes
* **Client:** Fixed a problem that prevented clients from being set up properly

### Temporary Deletion
* **Client:** The tv_embedded support for age restrictions has been temporarily removed for various reasons. (Automatic switching)

## v5.0.8 (2024/08/21)

### Features

* **Client:** Support for tv_embedded player to make age-restricted videos available
* **Player:** Change to use [youtube-po-token-generator](https://github.com/YunzheZJU/youtube-po-token-generator) to get poToken automatically when poToken is not specified. (For stable operation, generate manually.)
* **Log:** Improved log output

## v5.0.7 (2024/08/20)

### Features

* **Client:** Support for a variety of clients (Can be specified by `clients` argument)
```typescript
ytdl.getInfo('VIDEO_URL', {
    clients: ['C1', 'C2'],
});
```

* **Data:** Support for specifying whether to include or exclude data used in processing to prevent data growth (Default: false)
```typescript
ytdl.getInfo('VIDEO_URL', {
    includesPlayerAPIResponse: true,
    includesWatchPageInfo: true,
});
```

* **Log:** Changed to display warning if poToken is not specified

## v5.0.0 (2024/08/20)

### Features

* **Code:** Rewrote all code to TypeScript
* **Player:** poToken, and visitorData support
```typescript
ytdl.getInfo('VIDEO_URL', {
    poToken: 'PO_TOKEN',
    visitorData: 'VISITOR_DATA',
});
```
