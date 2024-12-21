import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class MWeb {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.mweb(params);

        return await Base.request(requestPath, { payload, headers }, params, 'MWeb');
    }
}
