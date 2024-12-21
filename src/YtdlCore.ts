type InitializationOptions = {
    disableInitialSetup?: boolean;
    poToken?: string;
    visitorData?: string;
    oauth2Credentials?: YTDL_OAuth2Credentials | null;
    html5Player?: YTDL_DownloadOptions['html5Player'];
};

import type { YTDL_Constructor, YTDL_DownloadOptions, YTDL_GetInfoOptions, YTDL_VideoInfo, YTDL_OAuth2Credentials, YTDL_ProxyOptions, YT_StreamingAdaptiveFormat, YTDL_VideoFormat } from './types';
import type { InternalDownloadOptions } from './core/types';

import { Platform } from './platforms/Platform';

import { download, downloadFromInfo } from './core/Download';
import { getBasicInfo, getFullInfo } from './core/Info';
import { getPlayerFunctions } from './core/Info/parser/Html5Player';
import { OAuth2 } from './core/OAuth2';

import { Url } from './utils/Url';
import { FormatUtils } from './utils/Format';
import { VERSION } from './utils/Constants';
import { Logger } from './utils/Log';
import { Signature } from './core/Signature';

const SHIM = Platform.getShim(),
    Cache = SHIM.cache,
    FileCache = SHIM.fileCache;

class YtdlCore {
    public static chooseFormat = FormatUtils.chooseFormat;
    public static filterFormats = FormatUtils.filterFormats;

    public static decipherFormats = function (formats: Array<YT_StreamingAdaptiveFormat<false>>, html5Player?: YTDL_DownloadOptions['html5Player']): Promise<Array<YT_StreamingAdaptiveFormat<true>>> {
        return new Promise(async (resolve) => {
            const HTML5_PLAYER_DATA = await getPlayerFunctions({}, html5Player),
                SIGNATURE = new Signature();

            await SIGNATURE.getDecipherFunctions(HTML5_PLAYER_DATA);
            await SIGNATURE.getNTransform(HTML5_PLAYER_DATA);

            const DECIPHERED_FORMATS = formats.map((format) => SIGNATURE.decipherFormat(format));

            resolve(DECIPHERED_FORMATS);
        });
    };

    public static toVideoFormats = function (formats: Array<YT_StreamingAdaptiveFormat<any>>, includesOriginalFormatData: boolean = false): Array<YTDL_VideoFormat> {
        const FORMATS = formats.map((format) => FormatUtils.addFormatMeta(format, includesOriginalFormatData));
        FORMATS.sort(FormatUtils.sortFormats);
        return FORMATS;
    };

    public static createOAuth2Credentials = OAuth2.createOAuth2Credentials;

    public static validateID = Url.validateID;
    public static validateURL = Url.validateURL;
    public static getURLVideoID = Url.getURLVideoID;
    public static getVideoID = Url.getVideoID;

    /* Get Info Options */
    public hl: YTDL_DownloadOptions['hl'] = 'en';
    public gl: YTDL_DownloadOptions['gl'] = 'US';
    public rewriteRequest: YTDL_GetInfoOptions['rewriteRequest'];
    public poToken: YTDL_DownloadOptions['poToken'];
    public disablePoTokenAutoGeneration: YTDL_DownloadOptions['disablePoTokenAutoGeneration'] = false;
    public visitorData: YTDL_DownloadOptions['visitorData'];
    public includesPlayerAPIResponse: YTDL_DownloadOptions['includesPlayerAPIResponse'] = false;
    public includesNextAPIResponse: YTDL_DownloadOptions['includesNextAPIResponse'] = false;
    public includesOriginalFormatData: YTDL_DownloadOptions['includesOriginalFormatData'] = false;
    public includesRelatedVideo: YTDL_DownloadOptions['includesRelatedVideo'] = true;
    public clients: YTDL_DownloadOptions['clients'];
    public disableDefaultClients: YTDL_DownloadOptions['disableDefaultClients'] = false;
    public disableRetryRequest: YTDL_DownloadOptions['disableRetryRequest'] = false;
    public oauth2: OAuth2 | null = null;
    public parsesHLSFormat: YTDL_DownloadOptions['parsesHLSFormat'] = false;
    public originalProxy: YTDL_DownloadOptions['originalProxy'];

    /* Format Selection Options */
    public quality: YTDL_DownloadOptions['quality'] | undefined;
    public filter: YTDL_DownloadOptions['filter'] | undefined;
    public excludingClients: YTDL_DownloadOptions['excludingClients'] = [];
    public includingClients: YTDL_DownloadOptions['includingClients'] = 'all';

    /* Download Options */
    public range: YTDL_DownloadOptions['range'] | undefined;
    public begin: YTDL_DownloadOptions['begin'] | undefined;
    public liveBuffer: YTDL_DownloadOptions['liveBuffer'] | undefined;
    public highWaterMark: YTDL_DownloadOptions['highWaterMark'] | undefined;
    public IPv6Block: YTDL_DownloadOptions['IPv6Block'] | undefined;
    public dlChunkSize: YTDL_DownloadOptions['dlChunkSize'] | undefined;
    public html5Player: YTDL_DownloadOptions['html5Player'] | undefined;

    /* Metadata */
    public version = VERSION;

    /* Constructor */
    constructor({ hl, gl, rewriteRequest, poToken, disablePoTokenAutoGeneration, visitorData, includesPlayerAPIResponse, includesNextAPIResponse, includesOriginalFormatData, includesRelatedVideo, clients, disableDefaultClients, disableRetryRequest, oauth2Credentials, parsesHLSFormat, originalProxy, quality, filter, excludingClients, includingClients, range, begin, liveBuffer, highWaterMark, IPv6Block, dlChunkSize, html5Player, disableBasicCache, disableFileCache, fetcher, logDisplay, noUpdate, disableInitialSetup }: YTDL_Constructor = {}) {
        const SHIM = Platform.getShim();

        /* Other Options */
        const LOG_DISPLAY = (logDisplay === 'none' ? [] : logDisplay) || ['info', 'success', 'warning', 'error'];
        SHIM.options.other.logDisplay = LOG_DISPLAY;
        Logger.logDisplay = LOG_DISPLAY;

        SHIM.options.other.noUpdate = noUpdate ?? false;

        if (fetcher) {
            SHIM.fetcher = fetcher;
            SHIM.requestRelated.originalProxy = originalProxy;
            SHIM.requestRelated.rewriteRequest = rewriteRequest;
        }

        if (disableBasicCache) {
            Cache.disable();
        }

        if (disableFileCache) {
            FileCache.disable();
        }

        /* Get Info Options */
        this.hl = hl || 'en';
        this.gl = gl || 'US';
        this.rewriteRequest = rewriteRequest || undefined;
        this.disablePoTokenAutoGeneration = disablePoTokenAutoGeneration ?? false;
        this.includesPlayerAPIResponse = includesPlayerAPIResponse ?? false;
        this.includesNextAPIResponse = includesNextAPIResponse ?? false;
        this.includesOriginalFormatData = includesOriginalFormatData ?? false;
        this.includesRelatedVideo = includesRelatedVideo ?? true;
        this.clients = clients || ['web', 'mweb', 'tv', 'ios'];
        this.disableDefaultClients = disableDefaultClients ?? false;
        this.parsesHLSFormat = parsesHLSFormat ?? false;
        this.disableRetryRequest = disableRetryRequest ?? false;

        this.originalProxy = originalProxy || undefined;
        if (this.originalProxy) {
            const QUERY_NAME = this.originalProxy.urlQueryName || 'url';

            Logger.debug(`<debug>"${this.originalProxy.base}"</debug> is used for <blue>API requests</blue>.`);
            Logger.debug(`<debug>"${this.originalProxy.download}"</debug> is used for <blue>video downloads</blue>.`);
            Logger.debug(`The query name <debug>"${QUERY_NAME}"</debug> is used to specify the URL in the request. <blue>(?${QUERY_NAME}=...)</blue>`);
        }

        /* Format Selection Options */
        this.quality = quality || undefined;
        this.filter = filter || undefined;
        this.excludingClients = excludingClients || [];
        this.includingClients = includingClients || 'all';

        /* Download Options */
        this.range = range || undefined;
        this.begin = begin || undefined;
        this.liveBuffer = liveBuffer || undefined;
        this.highWaterMark = highWaterMark || undefined;
        this.IPv6Block = IPv6Block || undefined;
        this.dlChunkSize = dlChunkSize || undefined;
        this.html5Player = html5Player || undefined;

        /* Async Initial setup */
        this.init(
            { disableInitialSetup, poToken, visitorData, oauth2Credentials, html5Player },
            {
                originalProxy,
                rewriteRequest,
            },
        );

        /* Load */
        SHIM.options.download = {
            hl: this.hl,
            gl: this.gl,
            rewriteRequest: this.rewriteRequest,
            poToken: this.poToken,
            disablePoTokenAutoGeneration: this.disablePoTokenAutoGeneration,
            visitorData: this.visitorData,
            includesPlayerAPIResponse: this.includesPlayerAPIResponse,
            includesNextAPIResponse: this.includesNextAPIResponse,
            includesOriginalFormatData: this.includesOriginalFormatData,
            includesRelatedVideo: this.includesRelatedVideo,
            clients: this.clients,
            disableDefaultClients: this.disableDefaultClients,
            oauth2Credentials,
            parsesHLSFormat: this.parsesHLSFormat,
            originalProxy: this.originalProxy,
            quality: this.quality,
            filter: this.filter,
            excludingClients: this.excludingClients,
            includingClients: this.includingClients,
            range: this.range,
            begin: this.begin,
            liveBuffer: this.liveBuffer,
            highWaterMark: this.highWaterMark,
            IPv6Block: this.IPv6Block,
            dlChunkSize: this.dlChunkSize,
            html5Player: this.html5Player,
            disableRetryRequest: this.disableRetryRequest,
        };
        Platform.load(SHIM);
    }

    /* Setup */
    private async init({ disableInitialSetup, poToken, visitorData, oauth2Credentials, html5Player }: InitializationOptions, requestInit: YTDL_ProxyOptions = {}) {
        if (!disableInitialSetup) {
            const HTML5_PLAYER_PROMISE = getPlayerFunctions(requestInit, html5Player);

            await this.setPoToken(poToken);
            await this.setVisitorData(visitorData);
            await this.setOAuth2(oauth2Credentials || null);

            if (!this.disablePoTokenAutoGeneration) {
                this.automaticallyGeneratePoToken(requestInit);
            }

            await HTML5_PLAYER_PROMISE;
        }
    }

    private async setPoToken(poToken?: string) {
        const PO_TOKEN_CACHE = await FileCache.get<string>('poToken');

        if (poToken) {
            this.poToken = poToken;
        } else if (PO_TOKEN_CACHE) {
            Logger.debug('PoToken loaded from cache.');
            this.poToken = PO_TOKEN_CACHE || undefined;
        }

        FileCache.set('poToken', this.poToken || '', { ttl: 60 * 60 * 24 });
    }

    private async setVisitorData(visitorData?: string) {
        const VISITOR_DATA_CACHE = await FileCache.get<string>('visitorData');

        if (visitorData) {
            this.visitorData = visitorData;
        } else if (VISITOR_DATA_CACHE) {
            Logger.debug('VisitorData loaded from cache.');
            this.visitorData = VISITOR_DATA_CACHE || undefined;
        }

        FileCache.set('visitorData', this.visitorData || '', { ttl: 60 * 60 * 24 });
    }

    private async setOAuth2(oauth2Credentials: YTDL_OAuth2Credentials | null) {
        const OAUTH2_CACHE = (await FileCache.get<YTDL_OAuth2Credentials>('oauth2')) || undefined;

        try {
            if (oauth2Credentials) {
                this.oauth2 = new OAuth2(oauth2Credentials) || undefined;
            } else if (OAUTH2_CACHE) {
                this.oauth2 = new OAuth2(OAUTH2_CACHE);
            } else {
                this.oauth2 = null;
            }
        } catch {
            this.oauth2 = null;
        }
    }

    private automaticallyGeneratePoToken(requestInit: YTDL_ProxyOptions) {
        if (!this.poToken && !this.visitorData) {
            Logger.debug('Since PoToken and VisitorData are <warning>not specified</warning>, they are generated <info>automatically</info>.');

            this.generatePoToken(requestInit)
                .then(({ poToken, visitorData }) => {
                    this.poToken = poToken;
                    this.visitorData = visitorData;

                    FileCache.set('poToken', this.poToken || '', { ttl: 60 * 60 * 24 });
                    FileCache.set('visitorData', this.visitorData || '', { ttl: 60 * 60 * 24 });
                })
                .catch(() => {});
        }
    }

    private initializeOptions(options: YTDL_DownloadOptions): InternalDownloadOptions {
        const INTERNAL_OPTIONS: InternalDownloadOptions = { ...options, oauth2: this.oauth2 };

        INTERNAL_OPTIONS.hl = options.hl || this.hl;
        INTERNAL_OPTIONS.gl = options.gl || this.gl;
        INTERNAL_OPTIONS.rewriteRequest = options.rewriteRequest || this.rewriteRequest;
        INTERNAL_OPTIONS.poToken = options.poToken || this.poToken;
        INTERNAL_OPTIONS.disablePoTokenAutoGeneration = options.disablePoTokenAutoGeneration || this.disablePoTokenAutoGeneration;
        INTERNAL_OPTIONS.visitorData = options.visitorData || this.visitorData;
        INTERNAL_OPTIONS.includesPlayerAPIResponse = options.includesPlayerAPIResponse || this.includesPlayerAPIResponse;
        INTERNAL_OPTIONS.includesNextAPIResponse = options.includesNextAPIResponse || this.includesNextAPIResponse;
        INTERNAL_OPTIONS.includesOriginalFormatData = options.includesOriginalFormatData || this.includesOriginalFormatData;
        INTERNAL_OPTIONS.includesRelatedVideo = options.includesRelatedVideo || this.includesRelatedVideo;
        INTERNAL_OPTIONS.clients = options.clients || this.clients;
        INTERNAL_OPTIONS.disableDefaultClients = options.disableDefaultClients || this.disableDefaultClients;
        INTERNAL_OPTIONS.disableRetryRequest = options.disableRetryRequest || this.disableRetryRequest;
        INTERNAL_OPTIONS.oauth2Credentials = options.oauth2Credentials || this.oauth2?.getCredentials();
        INTERNAL_OPTIONS.parsesHLSFormat = options.parsesHLSFormat || this.parsesHLSFormat;
        INTERNAL_OPTIONS.originalProxy = options.originalProxy || this.originalProxy || undefined;

        /* Format Selection Options */
        INTERNAL_OPTIONS.quality = options.quality || this.quality || undefined;
        INTERNAL_OPTIONS.filter = options.filter || this.filter || undefined;
        INTERNAL_OPTIONS.excludingClients = options.excludingClients || this.excludingClients || [];
        INTERNAL_OPTIONS.includingClients = options.includingClients || this.includingClients || 'all';

        /* Download Options */
        INTERNAL_OPTIONS.range = options.range || this.range || undefined;
        INTERNAL_OPTIONS.begin = options.begin || this.begin || undefined;
        INTERNAL_OPTIONS.liveBuffer = options.liveBuffer || this.liveBuffer || undefined;
        INTERNAL_OPTIONS.highWaterMark = options.highWaterMark || this.highWaterMark || undefined;
        INTERNAL_OPTIONS.IPv6Block = options.IPv6Block || this.IPv6Block || undefined;
        INTERNAL_OPTIONS.dlChunkSize = options.dlChunkSize || this.dlChunkSize || undefined;
        INTERNAL_OPTIONS.html5Player = options.html5Player || this.html5Player || undefined;

        if (!INTERNAL_OPTIONS.oauth2 && options.oauth2Credentials) {
            INTERNAL_OPTIONS.oauth2 = new OAuth2(options.oauth2Credentials);
        }

        return INTERNAL_OPTIONS;
    }

    public generatePoToken(requestInit: YTDL_ProxyOptions = {}): Promise<{ poToken: string; visitorData: string }> {
        return new Promise((resolve, reject) => {
            const generatePoToken = Platform.getShim().poToken;

            generatePoToken(requestInit)
                .then((data) => {
                    resolve(data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /** TIP: The options specified in new YtdlCore() are applied by default. (The function arguments specified will take precedence.) */
    public download(link: string, options: YTDL_DownloadOptions = {}): Promise<ReadableStream> {
        return download(link, this.initializeOptions(options)) as any;
    }
    /** TIP: The options specified in new YtdlCore() are applied by default. (The function arguments specified will take precedence.) */
    public downloadFromInfo(info: YTDL_VideoInfo, options: YTDL_DownloadOptions = {}): Promise<ReadableStream> {
        return downloadFromInfo(info, this.initializeOptions(options)) as any;
    }

    /** TIP: The options specified in new YtdlCore() are applied by default. (The function arguments specified will take precedence.) */
    public getBasicInfo(link: string, options: YTDL_DownloadOptions = {}) {
        return getBasicInfo(link, this.initializeOptions(options));
    }
    /** TIP: The options specified in new YtdlCore() are applied by default. (The function arguments specified will take precedence.) */
    public getFullInfo(link: string, options: YTDL_DownloadOptions = {}) {
        return getFullInfo(link, this.initializeOptions(options));
    }
}

export { YtdlCore };
