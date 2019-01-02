import { Request } from 'express';
import { IApiQuery } from './IApiQuery';
import { IApiMeta } from './IApiMeta';
import { IApiDocument } from './IApiModel';
export interface IApiRequest extends Request {
    query: IApiQuery;
    meta?: IApiMeta;
    data?: any[];
    stats?: any;
    model?: IApiDocument;
    user?: any;
    dateRange?: any;
}
//# sourceMappingURL=IApiRequest.d.ts.map