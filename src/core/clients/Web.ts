import { Clients, ClientsParams } from './meta/Clients';
import Base from './Base';

export default class Web {
    static async getPlayerResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.web(params);

        return await Base.request(requestPath, { payload, headers }, params, 'Web');
    }

    static async getNextResponse(params: ClientsParams) {
        const { requestPath, payload, headers } = Clients.web_nextApi(params);

        return await Base.request(requestPath, { payload, headers }, params, 'Next');
    }
}
