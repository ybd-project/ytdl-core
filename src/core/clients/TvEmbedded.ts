import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class TvEmbedded {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.tvEmbedded(params);

        return await Base.request(requestPath, { payload, headers }, params, 'TvEmbedded');
    }
}
