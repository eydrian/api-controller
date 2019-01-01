import { Model, Document } from 'mongoose';
import { ObjectID } from 'bson';
import { Response, NextFunction } from 'express';
import { IApiRequest } from './types/IApiRequest';
import { IApiDocument } from './types/IApiModel';
declare abstract class ApiController<T extends Model<Document>> {
    protected model: T;
    constructor(model: T);
    respondServerError(res: Response, error?: any): Response;
    respondNotFound(id: string | number | ObjectID, res: Response, modelName: string): Response;
    respondInvalidId(res: Response): Response;
    respondModelMissingError(res: Response): Response;
    respondValidationError(err: any, res: Response, next: NextFunction): Response | void;
    apiResponse(req: IApiRequest, res: Response, _next: NextFunction): Response;
    populateMeta(req: IApiRequest, _res: Response, next: NextFunction): void;
    protected hasModel(model?: IApiDocument): model is IApiDocument;
}
export default ApiController;
//# sourceMappingURL=api.controller.d.ts.map