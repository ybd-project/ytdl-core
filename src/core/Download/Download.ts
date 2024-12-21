import type { PassThrough } from 'stream';

import type { YTDL_ClientTypes, YTDL_VideoFormat, YTDL_VideoInfo } from '@/types';
import { InternalDownloadOptions } from '@/core/types';

import { getFullInfo } from '@/core/Info';

import { FormatUtils } from '@/utils/Format';
import { Logger } from '@/utils/Log';
import { Platform } from '@/platforms/Platform';
import { UserAgent } from '@/utils/UserAgents';

const DOWNLOAD_REQUEST_OPTIONS: RequestInit = {
        method: 'GET',
        headers: {
            accept: '*/*',
            origin: 'https://www.youtube.com',
            referer: 'https://www.youtube.com',
            DNT: '?1',
        },
        redirect: 'follow',
    },
    ReadableStream = Platform.getShim().polyfills.ReadableStream;

function requestSetup(url: string, requestOptions: any, options: InternalDownloadOptions): string {
    if (typeof options.rewriteRequest === 'function') {
        const { url: newUrl } = options.rewriteRequest(url, requestOptions, {
            isDownloadUrl: true,
        });

        url = newUrl;
    }

    if (options.originalProxy) {
        try {
            const PARSED = new URL(options.originalProxy.download);

            if (!url.includes(PARSED.host)) {
                url = `${PARSED.protocol}//${PARSED.host}${PARSED.pathname}?${options.originalProxy.urlQueryName || 'url'}=${encodeURIComponent(url)}`;
            }
        } catch (err) {
            Logger.debug('[ OriginalProxy ]: The original proxy could not be adapted due to the following error: ' + err);
        }
    }

    return url;
}

async function isDownloadUrlValid(format: YTDL_VideoFormat, options: InternalDownloadOptions): Promise<{ valid: boolean; reason?: string }> {
    return new Promise((resolve) => {
        const successResponseHandler = (res: Response) => {
                if (res.status.toString().startsWith('2')) {
                    Logger.debug(`[ ${format.sourceClientName} ]: <success>Video URL is normal.</success> The response was received with status code <success>"${res.status}"</success>.`);
                    resolve({ valid: true });
                } else {
                    errorResponseHandler(new Error(`Status code: ${res.status}`));
                }
            },
            errorResponseHandler = (reason: Error) => {
                Logger.debug(`[ ${format.sourceClientName} ]: The URL for the video <error>did not return a successful response</error>. Got another format.\nReason: <error>${reason.message}</error>`);
                resolve({ valid: false, reason: reason.message });
            };

        try {
            const TEST_URL = requestSetup(format.url, {}, options);

            Platform.getShim()
                .fetcher(TEST_URL, {
                    method: 'HEAD',
                })
                .then(
                    (res) => successResponseHandler(res),
                    (reason) => errorResponseHandler(reason),
                );
        } catch (err: any) {
            errorResponseHandler(err);
        }
    });
}

function getValidDownloadUrl(formats: YTDL_VideoInfo['formats'], options: InternalDownloadOptions): Promise<YTDL_VideoFormat> {
    return new Promise(async (resolve) => {
        let excludingClients: Array<YTDL_ClientTypes> = ['web'],
            format,
            isOk = false;

        try {
            format = FormatUtils.chooseFormat(formats, options);
        } catch (e) {
            throw e;
        }

        if (!format) {
            throw new Error('Failed to retrieve format data.');
        }

        while (isOk === false) {
            if (!format) {
                throw new Error('Failed to retrieve format data.');
            }

            const { valid, reason } = await isDownloadUrlValid(format, options);

            if (valid) {
                isOk = true;
            } else {
                if (format.sourceClientName !== 'unknown') {
                    excludingClients.push(format.sourceClientName);
                }

                try {
                    format = FormatUtils.chooseFormat(formats, {
                        excludingClients,
                        includingClients: reason?.includes('403') ? ['ios', 'android'] : 'all',
                        quality: options.quality,
                        filter: options.filter,
                    });
                } catch (e) {
                    throw e;
                }
            }
        }

        resolve(format);
    });
}

/** Reference: LuanRT/YouTube.js - Utils.ts */
async function* streamToIterable(stream: ReadableStream<Uint8Array> | PassThrough) {
    if (stream instanceof ReadableStream) {
        const READER = stream.getReader();

        try {
            while (true) {
                const { done, value } = await READER.read();
                if (done) {
                    return;
                }

                yield value;
            }
        } finally {
            READER.releaseLock();
        }
    } else {
        try {
            for await (const CHUNK of stream) {
                yield CHUNK;
            }
        } finally {
            stream.destroy();
        }
    }
}

function downloadVideo(videoUrl: string, requestOptions: any, options: InternalDownloadOptions, cancel?: AbortController): Promise<Response> {
    videoUrl = requestSetup(videoUrl, requestOptions, options);

    Logger.debug('[ Download ]: Requesting URL: <magenta>' + videoUrl + '</magenta>');

    const OPTIONS = cancel ? { ...requestOptions, signal: cancel.signal } : requestOptions;
    return Platform.getShim().fetcher(videoUrl, OPTIONS);
}

async function downloadFromInfoCallback(info: YTDL_VideoInfo, options: InternalDownloadOptions): Promise<ReadableStream> {
    if (!info.formats.length) {
        throw new Error('This video is not available due to lack of video format.');
    }

    const DL_CHUNK_SIZE = typeof options.dlChunkSize === 'number' ? options.dlChunkSize : 1024 * 1024 * 10,
        NO_NEED_SPECIFY_RANGE = (options.filter === 'audioandvideo' || options.filter === 'videoandaudio') && !options.range,
        FORMAT = await getValidDownloadUrl(info.formats, options);

    let requestOptions = { ...DOWNLOAD_REQUEST_OPTIONS },
        chunkStart = options.range ? options.range.start : 0,
        chunkEnd = options.range ? options.range.end || DL_CHUNK_SIZE : DL_CHUNK_SIZE,
        shouldEnd = false,
        cancel: AbortController;

    const AGENT_TYPE = FORMAT.sourceClientName === 'ios' || FORMAT.sourceClientName === 'android' ? FORMAT.sourceClientName : FORMAT.sourceClientName.includes('tv') ? 'tv' : 'desktop';

    requestOptions.headers = {
        ...requestOptions.headers,
        'User-Agent': UserAgent.getRandomUserAgent(AGENT_TYPE),
    };

    /* Reference: LuanRT/YouTube.js */
    if (NO_NEED_SPECIFY_RANGE) {
        const RESPONSE = await downloadVideo(FORMAT.url, requestOptions, options);

        if (!RESPONSE.ok) {
            throw new Error(`Download failed with status code <warning>"${RESPONSE.status}"</warning>.`);
        }

        const BODY = RESPONSE.body;

        if (!BODY) {
            throw new Error('Failed to retrieve response body.');
        }

        return BODY;
    }

    const READABLE_STREAM = new ReadableStream(
        {
            start() {},
            pull: async (controller) => {
                if (shouldEnd) {
                    controller.close();
                    return;
                }

                const CONTENT_LENGTH = FORMAT.contentLength ? parseInt(FORMAT.contentLength) : 0;
                if (chunkEnd >= CONTENT_LENGTH || options.range) {
                    shouldEnd = true;
                }

                return new Promise(async (resolve, reject) => {
                    try {
                        cancel = new AbortController();

                        const RESPONSE = await downloadVideo(FORMAT.url + '&range=' + chunkStart + '-' + chunkEnd, requestOptions, options, cancel);

                        if (!RESPONSE.ok) {
                            throw new Error(`Download failed with status code <warning>"${RESPONSE.status}"</warning>.`);
                        }

                        const BODY = RESPONSE.body;

                        if (!BODY) {
                            throw new Error('Failed to retrieve response body.');
                        }

                        for await (const CHUNK of streamToIterable(BODY)) {
                            controller.enqueue(CHUNK);
                        }

                        chunkStart = chunkEnd + 1;
                        chunkEnd += DL_CHUNK_SIZE;

                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            async cancel(reason) {
                cancel.abort(reason);
            },
        },
        {
            highWaterMark: options.highWaterMark || 1024 * 512,
            size(chunk) {
                return chunk?.byteLength || 0;
            },
        },
    );

    return READABLE_STREAM;
}

async function downloadFromInfo(info: YTDL_VideoInfo, options: InternalDownloadOptions): Promise<ReadableStream> {
    if (!info.full) {
        throw new Error('Cannot use `ytdl.downloadFromInfo()` when called with info from `ytdl.getBasicInfo()`');
    }

    return new Promise<ReadableStream>((resolve) => {
        resolve(downloadFromInfoCallback(info, options));
    });
}

function download(link: string, options: InternalDownloadOptions): Promise<ReadableStream> {
    return new Promise<ReadableStream>((resolve) => {
        getFullInfo(link, options)
            .then((info) => {
                resolve(downloadFromInfoCallback(info, options));
            })
            .catch((err) => {
                throw err;
            });
    });
}

export { download, downloadFromInfo };
