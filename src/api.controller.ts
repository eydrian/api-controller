import { Model, Document } from 'mongoose';
import { ObjectID } from 'bson';
import { Response, NextFunction } from 'express';
import { IApiRequest } from './types/IApiRequest';
import { IApiError } from './types/IApiError';
import { isString } from './helpers/isString';
import { IApiDocument } from './types/IApiModel';

abstract class ApiController<T extends Model<Document>> {
  protected model: T;

  constructor(model: T) {
    this.model = model;
  }

  // ERROR Responses
  respondServerError(res: Response, error: any): Response {
    return res.status(500).json({ error });
  }
  respondNotFound(
    id: string | number | ObjectID,
    res: Response,
    modelName: string
  ): Response {
    const error: IApiError = {
      id: 'notFound',
      message: `${ modelName } ${ id } does not exist`
    };

    return res.status(404).json({
      error: error
    });
  }
  respondInvalidId(res: Response): Response {
    const error: IApiError = {
      id: 'invalidId',
      message: 'Invalid id'
    };

    return res.status(400).json({
      error: error
    });
  }
  respondModelMissingError(res: Response): Response {
    const error: IApiError = {
      id: 'modelMissing',
      message: 'the model is missing in the request'
    };

    return res.status(400).json({
      error: error
    });
  }
  respondDeletionError(res: Response, err: IApiError): Response {
    const error: IApiError = {
      id: 'delete',
      message: err.message
    };

    return res.status(400).json({
      error: error
    });
  }
  respondValidationError(err: any, res: Response, next: NextFunction): Response | void {
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
  apiResponse(req: IApiRequest, res: Response, _next: NextFunction): Response {
    const hasMetaError = req.meta && req.meta.error;
    let status = 200;
    /* istanbul ignore if */
    if (hasMetaError) {
      status = 500;
    }

    return res.status(status).json({ meta: req.meta, data: req.data });
  }
  populateMeta(req: IApiRequest, _res: Response, next: NextFunction): void {
    const qTotal = req.query.total || {};

    this.model.countDocuments(qTotal, (err: any, total: number) => {
      /* istanbul ignore if */
      if (err) {
        return next(err);
      } else {
        const offset = req.query.offset;
        const limit = req.query.limit;
        req.meta = {
          total: total,
          count: req.data ? req.data.length : /* istanbul ignore next */ 0,
          offset: isString(offset) ? parseInt(offset, 10) : offset,
          limit: isString(limit) ? parseInt(limit, 10) : limit
        };

        return next();
      }
    });
  }
  protected hasModel(model?: IApiDocument): model is IApiDocument {
    return typeof model !== 'undefined';
  }
}

export default ApiController;
