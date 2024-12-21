import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class WebEmbedded {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.webEmbedded(params);

        return await Base.request(requestPath, { payload, headers }, params, 'WebEmbedded');
    }
}
