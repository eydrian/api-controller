import { Types } from 'mongoose';
import { Response, NextFunction } from 'express';
import {
  IApiRequest,
  IApiError,
  IApiModel
} from './types';
import ApiController from './api.controller';
import { IApiQuery } from './types/IApiQuery';
import { isString, toNumber } from './helpers';


const isValidId = Types.ObjectId.isValid;

abstract class BaseController<T extends IApiModel> extends ApiController<T> {
  protected filters: string[];

  constructor(model: T) {
    super(model);
    this.filters = ['type', 'deleted'];
  }
  index(req: IApiRequest, _res: Response, next: NextFunction) {
    let query: IApiQuery = {
      offset: 0,
      limit: 0
    };
    req.query.offset = this.parsePagination(req.query.offset, 0);
    req.query.limit = this.parsePagination(req.query.limit, 100);
    if (req.query.sort) { req.query.sort = this.parseSort(req.query.sort); }
    if (req.query.filter) { req.query = this.parseFilter(req.query); }

    /* istanbul ignore else */
    if (typeof this.model.parseQuery === 'function') {
      query = this.model.parseQuery(req.query);
    }

    if (!query.populate || !Array.isArray(query.populate)) {
      query.populate = [];
    }

    return this.model.find(query.q)
      .limit(toNumber(query.limit))
      .skip(toNumber(query.offset))
      .sort(query.sort)
      .select(query.select)
      .populate(query.populate)
      .exec((err: any, models: T[]) => {
        /* istanbul ignore if */
        if (err) {
          return next(err);
        } else {
          req.data = models;

          return next();
        }
      });
  }
  read(req: IApiRequest, res: Response, _next: NextFunction) {
    return res.jsonp(req.model.toObject());
  }
  create(req: IApiRequest, res: Response, next: NextFunction) {
    delete req.body._id;
    delete req.body.timestamps;

    const Model = this.model;
    const model = new Model(req.body);
    (<any>model).timestamps = {
      created: {
        by: req.user.username
      }
    };
    model.save((err, resModel) => {
      if (err) {
        return this.respondValidationError(err, res, next);
      } else {
        res.status(201).json(resModel.toObject());
      }
    });
  }
  update(req: IApiRequest, res: Response, next: NextFunction) {
    if (req.body._id === null) { delete req.body._id; }
    delete req.body.timestamps;
    const model = req.model;

    Object.keys(req.body).forEach((key) => {
      model[key] = req.body[key];
    });
    model.timestamps.updated.by = req.user.username;
    model.save((err: any, resModel: T) => {
      if (err) {
        return this.respondValidationError(err, res, next);
      } else {
        const response = resModel.toObject ? resModel.toObject() : resModel;

        return res.status(200).json(response);
      }
    });
  }
  softDelete(req: IApiRequest, res: Response, _next: NextFunction) {
    const model = req.model;
    model.mark.deleted = true;
    model.save((err: any, resModel: T) => {
      /* istanbul ignore if */
      if (err) {
        const error: IApiError = {
          id: 'delete',
          message: err.message
        };

        return res.status(400).json({
          error: error
        });
      } else {
        const response = resModel.toObject ? resModel.toObject() : resModel;

        return res.status(200).jsonp(response);
      }
    });
  }
  delete(req: IApiRequest, res: Response, _next: NextFunction) {
    const model = req.model;
    model.remove((err: any) => {
      /* istanbul ignore if */
      if (err) {
        const error: IApiError = {
          id: 'delete',
          message: err.message
        };
        return res.status(400).json({
          error: error
        });
      } else { return res.status(200).jsonp(model.toObject()); }
    });
  }
  findById(
    req: IApiRequest,
    res: Response,
    next: NextFunction,
    id: string,
    _urlParam: any,
    populate: string[]
  ): Response | void {
    if (isValidId(id)) {
      /* istanbul ignore if */
      if (typeof populate === 'undefined' || !populate || !Array.isArray(populate)) {
        populate = [];
      }

      this.model.findById(id).populate(populate).exec((err, model) => {
        /* istanbul ignore if */
        if (err) {
          return this.respondServerError(res);
        }
        if (!model) {
          return this.respondNotFound(id, res, this.model.modelName);
        } else {
          req.model = model;

          return next();
        }
      });
    } else { return this.respondInvalidId(res); }
  }
  stats(req: IApiRequest, res: Response, next: NextFunction) {
    this.model.countDocuments((err, result) => {
      if (err) { return this.respondServerError(res, err); } else {
        if (typeof req.stats !== 'object') {
          req.stats = {};
        }
        req.stats[this.model.collection.name] = result;

        return next();
      }
    });
  }
  statsResponse(req: IApiRequest, res: Response, _next: NextFunction) {
    if (typeof req.stats !== 'object') {
      req.stats = {};
    }

    return res.status(200).json(req.stats);
  }
  statistics(req: IApiRequest, res: Response, next: NextFunction) {
    if (typeof this.model.statistics === 'function') {
      const query = req.dateRange || {};
      this.model.statistics(query, (err, result) => {
        if (err) { return this.respondServerError(res, err); } else {
          if (typeof req.stats !== 'object') { req.stats = {}; }
          req.stats[this.model.collection.name] = result;

          return next();
        }
      });
    } else { return this.stats(req, res, next); }
  }
  parseDateRange(
    req: IApiRequest,
    _res: Response,
    next: NextFunction,
    _id: string,
    _urlParam: string
  ) {
    // FIXME: this function is called twice for /year/month ....
    const year = parseInt(req.params.year, 10);
    let month = parseInt(req.params.month, 10);
    let toMonth = 12;
    if (!isNaN(year)) {
      if (isNaN(month)) { month = 0; } else {
        month = Math.max(Math.min(month, 12), 1);
        toMonth = --month + 1;
      }
      let from: Date = new Date();
      from = new Date(from.setFullYear(year, month, 1));
      from = new Date(from.setHours(0, 0, 0 , 0));
      let to = new Date(from.valueOf());
      to = new Date(to.setFullYear(year, toMonth, 1));

      if (typeof req.stats !== 'object') { req.stats = {}; }
      req.stats.range = {
        from: from,
        to: to
      };

      req.dateRange = { $and: [{ date: { $gte: from }}, { date: { $lt: to }}]};
    }

    return next();
  }
  parseSort(sort: string): any {
    const parsedSort: {[key: string]: number} = {};
    try {
      const _sort: {[key: string]: string} = JSON.parse(sort);
      Object.keys(_sort).forEach((key) => {
        parsedSort[key] = parseInt(_sort[key], 10);
      });
    } catch (e) {
      /* istanbul ignore next */
      if (e.name === 'SyntaxError') {
        const field = sort;
        parsedSort[field] = 1;
      }
    }

    return parsedSort;
  }
  parseFilter(query: IApiQuery) {
    let filter: {[key: string]: string} = {};

    try {
      filter = query.filter ? JSON.parse(query.filter.replace(/\'/g, '"')) : {};
    } catch (e) {
      filter = {};
    }

    this.filters.forEach(f => {
      if (typeof filter[f] !== 'undefined' && filter[f] !== null) {
        query[f] = filter[f].toString();
      }
    });

    return query;
  }

  parsePagination(field: string | number, boundary: number) {
    const value = isString(field) ? parseInt(field, 10) : field;

    return isNaN(value) ? boundary : value;
  }

}

export default BaseController;