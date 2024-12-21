import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class Tv {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.tv(params);

        return await Base.request(requestPath, { payload, headers }, params, 'Tv');
    }
}
