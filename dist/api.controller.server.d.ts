import { Model, Document } from 'mongoose';
import { Response, NextFunction } from 'express';
import { IApiRequest } from './types/IApiRequest';
declare abstract class ApiController<T extends Model<Document>> {
    protected model: T;
    constructor(model: T);
    respondServerError(res: Response, error?: any): import("express-serve-static-core").Response;
    respondNotFound(id: string, res: Response, modelName: string): import("express-serve-static-core").Response;
    respondInvalidId(res: Response): import("express-serve-static-core").Response;
    respondValidationError(err: any, res: Response, next: NextFunction): void | import("express-serve-static-core").Response;
    apiResponse(req: IApiRequest, res: Response, _next: NextFunction): import("express-serve-static-core").Response;
    populateMeta(req: IApiRequest, _res: Response, next: NextFunction): import("mongoose").Query<number>;
}
export default ApiController;
//# sourceMappingURL=api.controller.server.d.ts.map