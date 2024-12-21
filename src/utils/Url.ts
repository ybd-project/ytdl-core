const BASE_URL = 'https://www.youtube.com',
    URL_REGEX = /^https?:\/\//,
    ID_REGEX = /^[a-zA-Z0-9-_]{11}$/,
    VALID_QUERY_DOMAINS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'gaming.youtube.com']),
    VALID_PATH_DOMAINS = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts|live)\/)/;

class Url {
    static getBaseUrl() {
        return BASE_URL;
    }

    static getPlayerJsUrl(playerId: string) {
        return `${BASE_URL}/s/player/${playerId}/player_ias.vflset/en_US/base.js`;
    }

    static getWatchPageUrl(id: string) {
        return `${BASE_URL}/watch?v=${id}`;
    }

    static getEmbedUrl(id: string) {
        return `${BASE_URL}/embed/${id}`;
    }

    static getIframeApiUrl() {
        return `${BASE_URL}/iframe_api`;
    }

    static getInnertubeBaseUrl(useGoogleApis?: boolean) {
        if (useGoogleApis) {
            return `https://youtubei.googleapis.com/youtubei/v1`;
        }

        return `${BASE_URL}/youtubei/v1`;
    }

    static getTvUrl() {
        return `${BASE_URL}/tv`;
    }

    static getTokenApiUrl() {
        return `${BASE_URL}/o/oauth2/token`;
    }

    static getDeviceCodeApiUrl() {
        return `${BASE_URL}/o/oauth2/device/code`;
    }

    static validateID(id: string): boolean {
        return ID_REGEX.test(id.trim());
    }

    static getURLVideoID(link: string): string {
        const PARSED = new URL(link.trim());
        let id = PARSED.searchParams.get('v');

        if (VALID_PATH_DOMAINS.test(link.trim()) && !id) {
            const PATHS = PARSED.pathname.split('/');
            id = PARSED.host === 'youtu.be' ? PATHS[1] : PATHS[2];
        } else if (PARSED.hostname && !VALID_QUERY_DOMAINS.has(PARSED.hostname)) {
            throw new Error('Not a YouTube domain');
        }

        if (!id) {
            throw new Error(`No video id found: "${link}"`);
        }

        id = id.substring(0, 11);

        if (!this.validateID(id)) {
            throw new TypeError(`Video id (${id}) does not match expected format (${ID_REGEX.toString()})`);
        }

        return id;
    }

    static getVideoID(str: string): string | null {
        if (this.validateID(str)) {
            return str;
        } else if (URL_REGEX.test(str.trim())) {
            return this.getURLVideoID(str);
        } else {
            return null;
        }
    }

    static validateURL(str: string): boolean {
        try {
            this.getURLVideoID(str);

            return true;
        } catch (e) {
            return false;
        }
    }
}

export { Url };
