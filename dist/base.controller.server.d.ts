/// <reference types="mongoose" />
import { Response, NextFunction } from 'express';
import { IApiRequest, IApiModel } from './types';
import ApiController from './api.controller.server';
import { IApiQuery } from './types/IApiQuery';
declare abstract class BaseController<T extends IApiModel> extends ApiController<T> {
    protected filters: string[];
    constructor(model: T);
    index(req: IApiRequest, _res: Response, next: NextFunction): Promise<import("mongoose").Document[]>;
    read(req: IApiRequest, res: Response, _next: NextFunction): import("express-serve-static-core").Response;
    create(req: IApiRequest, res: Response, next: NextFunction): void;
    update(req: IApiRequest, res: Response, next: NextFunction): void;
    softDelete(req: IApiRequest, res: Response, _next: NextFunction): void;
    delete(req: IApiRequest, res: Response, _next: NextFunction): void;
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
//# sourceMappingURL=base.controller.server.d.ts.map