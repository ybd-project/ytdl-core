import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class Android {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.android(params);

        return await Base.request(requestPath, { payload, headers }, params, 'Android');
    }
}
