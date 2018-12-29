import { Response, NextFunction } from 'express';
import { IApiRequest, IApiModel } from './types';
import ApiController from './api.controller';
import { IApiQuery } from './types/IApiQuery';
import { IApiDocument } from './types/IApiModel';
declare abstract class BaseController<T extends IApiModel> extends ApiController<T> {
    protected filters: string[];
    constructor(model: T);
    index(req: IApiRequest, _res: Response, next: NextFunction): Promise<IApiDocument[]>;
    read(req: IApiRequest, res: Response, _next: NextFunction): import("express-serve-static-core").Response;
    create(req: IApiRequest, res: Response, next: NextFunction): void;
    update(req: IApiRequest, res: Response, next: NextFunction): Response | void;
    softDelete(req: IApiRequest, res: Response, _next: NextFunction): Response | void;
    delete(req: IApiRequest, res: Response, _next: NextFunction): Response | void;
    findById(req: IApiRequest, res: Response, next: NextFunction, id: string, _urlParam: any, populate: string[]): Response | void;
    stats(req: IApiRequest, res: Response, next: NextFunction): void;
    statsResponse(req: IApiRequest, res: Response, _next: NextFunction): import("express-serve-static-core").Response;
    statistics(req: IApiRequest, res: Response, next: NextFunction): void;
    parseDateRange(req: IApiRequest, _res: Response, next: NextFunction, _id: string, _urlParam: string): void;
    parseSort(sort: string): any;
    parseFilter(query: IApiQuery): IApiQuery;
    parsePagination(field: string | number, boundary: number): number;
}
export default BaseController;
//# sourceMappingURL=base.controller.d.ts.map