# @ybd-project/ytdl-core - v6

[![npm version](https://badge.fury.io/js/@ybd-project%2Fytdl-core.svg)](https://badge.fury.io/js/@ybd-project%2Fytdl-core)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/@ybd-project/ytdl-core/badge?style=rounded)](https://www.jsdelivr.com/package/npm/@ybd-project/ytdl-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

YBD Project fork of `ytdl-core`. This fork is dedicated to developing a YouTube downloader that is fast, stable, and takes into account various use cases, with reference to [LuanRT/YouTube.js](https://github.com/LuanRT/YouTube.js) and [yt-dlp](https://github.com/yt-dlp/yt-dlp).

> [!NOTE]
> If you are looking for v5 documentation for `@ybd-project/ytdl-core`, please click [here](https://github.com/ybd-project/ytdl-core/blob/latest/v5/README.md).

## Table of Contents

<ol>
    <li><a href="#ℹ️announcements-at-this-timeℹ️">ℹ️Announcements at this timeℹ️</a></li>
    <li><a href="#prerequisite">Prerequisite</a></li>
    <li>
        <a href="#operating-environment">Operating Environment</a>
        <ul>
            <li><a href="#default-nodejs">Default (Node.js)</a></li>
            <li><a href="#proxy-support">Browser</a></li>
            <li><a href="#serverless">Serverless</a></li>
        </ul>
    </li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#api-documentation">API Documentation</a></li>
    <li><a href="#basic-usage">Basic Usage</a></li>
    <li><a href="#examples">Examples</a></li>
    <li>
        <a href="#precautions">Precautions</a>
        <ul>
            <li><a href="#limitations">Limitations</a></li>
            <li><a href="#rate-limiting">Rate Limiting</a></li>
        </ul>
    </li>
    <li><a href="#license">License</a></li>
</ol>

## ℹ️Announcements at this timeℹ️

There are no announcements at this time.

<!-- > [!NOTE]
> As of v5.0.5, related videos cannot be retrieved. This will be fixed later.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action. -->

## Prerequisite

To use `@ybd-project/ytdl-core` without problems, **use Node.js 16 or higher.** (Recommended is Node.js 18 or higher.)

> [!IMPORTANT]
> Use with Node.js 16 is not recommended, but will be supported as much as possible.

## Operating Environment

> [!IMPORTANT]
> `@ybd-project/ytdl-core` has not been tested in non-Node.js environments such as Deno. If you need ytdl-core optimized for these environments, please create an [issue](https://github.com/ybd-project/ytdl-core/issues/new?assignees=&labels=feature&projects=&template=feature_request.md&title=).

### Default (Node.js)

As usual, when using Node.js, as noted in the prerequisites, v16 or higher will work fine.
If you have an example that does not work with 16 or higher versions, please create an [issue](https://github.com/ybd-project/ytdl-core/issues/new?assignees=&labels=bug&projects=&template=bug_report.md&title=).

### Browser

When using a browser, the latest version is preferred due to the API used.
However, when operating a website or other site, it is unknown which version and browser the client will use, so the following are the main browsers (Chrome, Edge, Firefox, Brave, Opera, Safari) that are currently confirmed to work.

#### List

**Live demo used for testing: [ytdlcore.static.jp](https://ytdlcore.static.jp/)**

|    Browser Name     | Supported Versions |
| :-----------------: | :----------------: |
|  **Google Chrome**  |    v76 - latest    |
| **Microsoft Edge**  |    v80 - latest    |
| **Mozilla FireFox** |    v78 - latest    |
|  **Apple Safari**   |    v14 - latest    |
|      **Brave**      |    v1 - latest     |
|      **Opera**      |    v63 - latest    |

(Tested with [BrowserStack](https://live.browserstack.com/))

### Serverless

We have confirmed that `ytdl-core` for serverless functions works properly in the following environment.

> [!TIP]
> We recommend deploying to Cloudflare Workers because of its simplicity and lower cost compared to other platforms.

|      Service Name      |                 Remarks                 |
| :--------------------: | :-------------------------------------: |
| **Cloudflare Workers** | With `nodejs_compat` compatibility flag |
|  **Vercel Functions**  |         Streaming doesn't work.         |

## Installation

```bash
npm install @ybd-project/ytdl-core@latest
```

Make sure you're installing the latest version of `@ybd-project/ytdl-core` to keep up with the latest fixes.

## API Documentation

For details API documentation, see the [Wiki](https://github.com/ybd-project/ytdl-core/wiki).

## Basic Usage

Only a simple example is given in the README. For a list of options and other advanced usage, please refer to the [API Documentation](#api-documentation).

```ts
import fs from 'fs';
import { YtdlCore, toPipeableStream } from '@ybd-project/ytdl-core';
// For browser: import { YtdlCore } from '@ybd-project/ytdl-core/browser';
// For serverless functions: import { YtdlCore } from '@ybd-project/ytdl-core/serverless';

// JavaScript: const { YtdlCore } = require('@ybd-project/ytdl-core');

const ytdl = new YtdlCore({
    // The options specified here will be the default values when functions such as getFullInfo are executed.
});

// Download a video
ytdl.download('https://www.youtube.com/watch?v=dQw4w9WgXcQ').then((stream) => toPipeableStream(stream).pipe(fs.createWriteStream('video.mp4')));

// Get video info
ytdl.getBasicInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ').then((info) => {
    console.log(info.videoDetails.title);
});
```

## Examples

See the Examples folder for [examples](https://github.com/ybd-project/ytdl-core/tree/main/examples) of using `@ybd-project/ytdl-core`.

## Precautions

### Limitations

`@ybd-project/ytdl-core` is unable to retrieve or download information from the following videos.

-   Regionally restricted (requires a [proxy](#proxy-support))
-   Private (if you have access, requires [OAuth2](#oauth2-support))
-   Rentals (if you have access, requires [OAuth2](#oauth2-support))
-   YouTube Premium content (if you have access, requires [OAuth2](#oauth2-support))
-   Only [HLS Livestreams](https://en.wikipedia.org/wiki/HTTP_Live_Streaming) are currently supported. Other formats will get filtered out in ytdl.chooseFormats

The URL to view the retrieved video is valid for 6 hours. (In some cases, downloading may only be possible from the same IP.)

### Rate Limiting

When doing too many requests YouTube might block. This will result in your requests getting denied with HTTP-StatusCode 429. The following steps might help you:

-   Update `@ybd-project/ytdl-core` to the latest version
-   Use OAuth2 (you can find an example [here](#oauth2-support))
-   Use proxies (you can find an example [here](#proxy-support))
-   Extend the Proxy Idea by rotating (IPv6-)Addresses
    -   read [this](https://github.com/fent/node-ytdl-core#how-does-using-an-ipv6-block-help) for more information about this
-   Wait it out (it usually goes away within a few days)

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
