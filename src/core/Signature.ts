import type { Html5PlayerCache, YT_StreamingAdaptiveFormat } from '@/types';
import type { YTDL_DecipherFunction, YTDL_NTransformFunction } from '@/types/Html5Player';

import { Platform } from '@/platforms/Platform';

import { Logger } from '@/utils/Log';
import { getDecipherFunction, getNTransformFunction } from '@/utils/Html5Player';

const SIGNATURE_TIMESTAMP_REGEX = /signatureTimestamp:(\d+)/g,
    SHIM = Platform.getShim(),
    FILE_CACHE = SHIM.fileCache;

/* Decipher */
function getDecipheredFormat(format: YT_StreamingAdaptiveFormat<false>, decipherFunction: YTDL_DecipherFunction | null, nTransformFunction: YTDL_NTransformFunction | null): YT_StreamingAdaptiveFormat<true> {
    const DECIPHERED = format as any;

    DECIPHERED._deciphered = true;
    if (!decipherFunction) {
        return DECIPHERED;
    }

    const decipher = (url: string): string => {
            const SEARCH_PARAMS = new URLSearchParams('?' + url),
                PARAMS_URL = SEARCH_PARAMS.get('url')?.toString() || '',
                PARAMS_S = SEARCH_PARAMS.get('s');

            if (!PARAMS_S) {
                return PARAMS_URL;
            }

            try {
                const COMPONENTS = new URL(decodeURIComponent(PARAMS_URL)),
                    RESULTS = SHIM.polyfills.eval(`var ${decipherFunction.argumentName}='${decodeURIComponent(PARAMS_S)}';${decipherFunction.code}`);

                if (RESULTS === undefined) {
                    Logger.error(`[ Decipher ]: Decipher failed.\nCode: var ${decipherFunction.argumentName}='${decodeURIComponent(PARAMS_S)}';${decipherFunction.code}`);
                    return PARAMS_URL;
                }

                COMPONENTS.searchParams.set(SEARCH_PARAMS.get('sp')?.toString() || 'sig', RESULTS);

                return COMPONENTS.toString();
            } catch (err) {
                Logger.error(`[ Decipher ]: <error>Failed</error> to decipher URL: <error>${err}</error>`);
                return PARAMS_URL;
            }
        },
        nTransform = (url: string): string => {
            const COMPONENTS = new URL(decodeURIComponent(url)),
                N = COMPONENTS.searchParams.get('n');

            if (!N || !nTransformFunction) {
                return url;
            }

            try {
                const RESULTS = SHIM.polyfills.eval(`var ${nTransformFunction.argumentName}='${decodeURIComponent(N)}';${nTransformFunction.code}`);

                if (RESULTS === undefined) {
                    Logger.error(`[ NTransform ]: N transform failed.\nCode: var ${nTransformFunction.argumentName}='${decodeURIComponent(N)}';${nTransformFunction.code}`);
                    return url;
                }

                COMPONENTS.searchParams.set('n', RESULTS);

                return COMPONENTS.toString();
            } catch (err) {
                Logger.error(`[ NTransform ]: <error>Failed</error> to transform N: <error>${err}</error>`);
                return url;
            }
        },
        CIPHER = !format.url,
        VIDEO_URL = format.url || format.signatureCipher || format.cipher;

    if (!VIDEO_URL) {
        return DECIPHERED;
    }

    DECIPHERED.url = nTransform(CIPHER ? decipher(VIDEO_URL) : VIDEO_URL);
    delete DECIPHERED.signatureCipher;
    delete DECIPHERED.cipher;

    return DECIPHERED;
}

class Signature {
    public decipherFunction: YTDL_DecipherFunction | null = null;
    public nTransformFunction: YTDL_NTransformFunction | null = null;

    public static getSignatureTimestamp(body?: string): string {
        if (!body) {
            return '0';
        }

        const MATCH = body.match(SIGNATURE_TIMESTAMP_REGEX);

        if (MATCH) {
            return MATCH[0].split(':')[1];
        }

        return '0';
    }

    public decipherFormat(format: YT_StreamingAdaptiveFormat<false>): YT_StreamingAdaptiveFormat<true> {
        return getDecipheredFormat(format, this.decipherFunction, this.nTransformFunction);
    }

    public decipherFormats(formats: Array<YT_StreamingAdaptiveFormat>): Record<string, YT_StreamingAdaptiveFormat> {
        const DECIPHERED_FORMATS: Record<string, YT_StreamingAdaptiveFormat> = {};

        formats.forEach((format: any) => {
            if (!format) {
                return;
            }

            getDecipheredFormat(format, this.decipherFunction, this.nTransformFunction);

            DECIPHERED_FORMATS[format.url] = format;
        });

        return DECIPHERED_FORMATS;
    }

    public async getDecipherFunctions({ id, body }: Html5PlayerCache) {
        if (this.decipherFunction) {
            return this.decipherFunction;
        }

        const HTML5_PLAYER_CACHE = await FILE_CACHE.get<Html5PlayerCache>('html5Player');

        if (HTML5_PLAYER_CACHE) {
            if (!this.decipherFunction) {
                this.decipherFunction = HTML5_PLAYER_CACHE.functions.decipher;
            }

            return HTML5_PLAYER_CACHE;
        }

        const DECIPHER_FUNCTION = getDecipherFunction(id, body) || null;

        this.decipherFunction = DECIPHER_FUNCTION;

        return DECIPHER_FUNCTION;
    }

    public async getNTransform({ id, body }: Html5PlayerCache) {
        if (this.nTransformFunction) {
            return this.nTransformFunction;
        }

        const HTML5_PLAYER_CACHE = await FILE_CACHE.get<Html5PlayerCache>('html5Player');

        if (HTML5_PLAYER_CACHE) {
            if (!this.nTransformFunction) {
                this.nTransformFunction = HTML5_PLAYER_CACHE.functions.nTransform;
            }

            return HTML5_PLAYER_CACHE;
        }

        const N_TRANSFORM_FUNCTION = getNTransformFunction(id, body) || null;

        this.nTransformFunction = N_TRANSFORM_FUNCTION;

        return N_TRANSFORM_FUNCTION;
    }
}

export { Signature };
