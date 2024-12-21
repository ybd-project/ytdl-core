import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class Ios {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.ios(params);

        return await Base.request(requestPath, { payload, headers }, params, 'Ios');
    }
}
