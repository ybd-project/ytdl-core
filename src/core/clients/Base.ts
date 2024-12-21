type RequestOptions = { payload: string; headers: Record<string, any> };

import type { YT_PlayerApiResponse, YTDL_InnertubeResponseInfo, YTDL_RequestOptions } from '@/types';
import type { UpperCaseClientTypes } from '@/types/_internal';

import { Platform } from '@/platforms/Platform';

import { PlayerRequestError, UnrecoverableError } from '@/core/errors';
import { Fetcher } from '@/core/Fetcher';

import { Logger } from '@/utils/Log';

import type { ClientsParams } from './meta/Clients';
import { Url } from '@/utils/Url';

const SHIM = Platform.getShim();

export default class Base {
    private static playError(playerResponse: YT_PlayerApiResponse | null): Error | null {
        const PLAYABILITY = playerResponse && playerResponse.playabilityStatus;

        if (!PLAYABILITY) {
            return null;
        }

        const STATUS = playerResponse.playabilityStatus.reason || null;
        if (PLAYABILITY.status === 'ERROR' || PLAYABILITY.status === 'LOGIN_REQUIRED') {
            return new UnrecoverableError(PLAYABILITY.reason || (PLAYABILITY.messages && PLAYABILITY.messages[0]) || 'Unknown error.', STATUS);
        } else if (PLAYABILITY.status === 'LIVE_STREAM_OFFLINE') {
            return new UnrecoverableError(PLAYABILITY.reason || 'The live stream is offline.', STATUS);
        } else if (PLAYABILITY.status === 'UNPLAYABLE') {
            return new UnrecoverableError(PLAYABILITY.reason || 'This video is unavailable.', STATUS);
        }

        return null;
    }

    static request<T = YT_PlayerApiResponse>(requestPath: string, requestOptions: RequestOptions, params: ClientsParams, clientName: UpperCaseClientTypes | 'Next'): Promise<YTDL_InnertubeResponseInfo<T>> {
        return new Promise(async (resolve, reject) => {
            const HEADERS: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'X-Origin': 'https://www.youtube.com',
                    ...requestOptions.headers,
                },
                OPTS: YTDL_RequestOptions = {
                    requestOptions: {
                        method: 'POST',
                        headers: HEADERS,
                        body: typeof requestOptions.payload === 'string' ? requestOptions.payload : JSON.stringify(requestOptions.payload),
                    },
                    rewriteRequest: params.options.rewriteRequest,
                    originalProxy: params.options.originalProxy,
                },
                IS_NEXT_API = requestPath.includes('/next'),
                ALLOW_RETRY_REQUEST = !params.options.disableRetryRequest && SHIM.runtime !== 'browser',
                responseHandler = (response: YT_PlayerApiResponse, isRetried = false) => {
                    const PLAY_ERROR = this.playError(response);

                    if (PLAY_ERROR) {
                        if (!isRetried && ALLOW_RETRY_REQUEST) {
                            return retryRequest(PLAY_ERROR);
                        }

                        return reject({
                            isError: true,
                            error: PLAY_ERROR,
                            contents: response,
                        });
                    }

                    if (!IS_NEXT_API && (!response.videoDetails || params.videoId !== response.videoDetails.videoId)) {
                        const ERROR = new PlayerRequestError('Malformed response from YouTube', response, null);
                        ERROR.response = response;

                        if (!isRetried && ALLOW_RETRY_REQUEST) {
                            return retryRequest(ERROR);
                        }

                        return reject({
                            isError: true,
                            error: ERROR,
                            contents: response,
                        });
                    }

                    resolve({
                        isError: false,
                        error: null,
                        contents: response as T,
                    });
                },
                retryRequest = (error?: Error) => {
                    OPTS.originalProxy = undefined;
                    OPTS.rewriteRequest = undefined;

                    const HEADERS = new SHIM.polyfills.Headers(OPTS.requestOptions?.headers);

                    HEADERS.delete('Authorization');

                    if (!OPTS.requestOptions) {
                        OPTS.requestOptions = {};
                    }
                    OPTS.requestOptions.headers = HEADERS;

                    Logger.debug(`[ ${clientName} ]: <info>Wait 2 seconds</info> and <warning>retry request...</warning> (Reason: <error>${error?.message}</error>)`);
                    setTimeout(() => {
                        Fetcher.request<YT_PlayerApiResponse>(Url.getInnertubeBaseUrl(true) + requestPath, OPTS)
                            .then((res) => responseHandler(res, true))
                            .catch((err) => {
                                reject({
                                    isError: true,
                                    error: err,
                                    contents: null,
                                });
                            });
                    }, 2000);

                    return;
                };

            try {
                Fetcher.request<YT_PlayerApiResponse>(Url.getInnertubeBaseUrl() + requestPath, OPTS)
                    .then((res) => responseHandler(res, false))
                    .catch((err) => {
                        if (ALLOW_RETRY_REQUEST) {
                            return retryRequest(err);
                        }

                        reject({
                            isError: true,
                            error: err,
                            contents: null,
                        });
                    });
            } catch (err: any) {
                if (ALLOW_RETRY_REQUEST) {
                    return retryRequest(err);
                }

                reject({
                    isError: true,
                    error: err,
                    contents: null,
                });
            }
        });
    }
}
