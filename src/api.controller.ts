import { Model, Document } from 'mongoose';
import { Response, NextFunction } from 'express';
import { IApiRequest } from './types/IApiRequest';
import { IApiError } from './types/IApiError';
import { isString } from './helpers/isString';

abstract class ApiController<T extends Model<Document>> {
  protected model: T;

  constructor(model: T) {
    this.model = model;
  }

  // ERROR Responses
  respondServerError(res: Response, error?: any) {
    const serverError: IApiError = {
      id: 'serverError',
      message: `failed to get ${ this.model.modelName }`
    };

    return res.status(500).json({
      error: error || serverError
    });
  }
  respondNotFound(id: string, res: Response, modelName: string) {
    const error: IApiError = {
      id: 'notFound',
      message: `${ modelName || this.model.modelName } ${ id } does not exist`
    };

    return res.status(404).json({
      error: error
    });
  }
  respondInvalidId(res: Response) {
    const error: IApiError = {
      id: 'invalidId',
      message: 'Invalid id'
    };

    return res.status(400).json({
      error: error
    });
  }
  respondValidationError(err: any, res: Response, next: NextFunction) {
    if (err.name === 'ValidationError') {
      const error: IApiError = {
        id: 'validationError',
        message: err.message,
        fields: err.errors
      };

      return res.status(400).json({
        error: error
      });
    }
    /* istanbul ignore else */
    if (err.code === 11000) {
      return res.status(400).json({
        error: {
          id: 'duplicate',
          message: `${ this.model.modelName } already exists`
        },
      });
    } else {
      return next(err);
    }
  }
  apiResponse(req: IApiRequest, res: Response, _next: NextFunction) {
    const hasMetaError = req.meta && req.meta.error;
    let status = 200;
    /* istanbul ignore if */
    if (hasMetaError) { status = 500; }

    return res.status(status).json({ meta: req.meta, data: req.data });
  }
  populateMeta(req: IApiRequest, _res: Response, next: NextFunction) {
    const qTotal = req.query.total || {};

    return this.model.countDocuments(qTotal, (err: any, total: number) => {
      /* istanbul ignore if */
      if (err) {
        return next(err);
      } else {
        const offset = req.query.offset;
        const limit = req.query.limit;
        req.meta = {
          total: total,
          count: req.data ? req.data.length : /* istanbul ignore next */ 0,
          offset:  isString(offset) ? parseInt(offset, 10) : offset,
          limit: isString(limit) ? parseInt(limit, 10) : limit
        };

        return next();
      }
    });
  }
}

export default ApiController;
