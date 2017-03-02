'use strict';

const ApiController = require('./api.controller.server');

const isValidId = require('mongoose').Types.ObjectId.isValid;

class BaseController extends ApiController {
  constructor(model) {
    /* istanbul ignore if */
    if (new.target === BaseController) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
    super(model);
    this.filters = ['type', 'deleted'];
  }
  index(req, res, next) {
    let query = {};
    if (req.query.sort) req.query.sort = this.parseSort(req.query.sort);
    if (req.query.offset) req.query.offset = parseInt(req.query.offset);
    if (req.query.filter) req.query = this.parseFilter(req.query);

    /* istanbul ignore else */
    if (typeof this.model.parseQuery === 'function') {
      query = this.model.parseQuery(req.query);
    }

    if (!query.populate || !Array.isArray(query.populate)) query.populate = [];

    return this.model.find(query.q)
      .limit(query.limit)
      .skip(query.offset)
      .sort(query.sort)
      .select(query.select)
      .populate(query.populate)
      .exec((err, models) => {
        /* istanbul ignore if */
        if (err) return next(err, null);
        else {
          req.data = models;

          return next();
        }
      });
  }
  read(req, res, next) {
    return res.jsonp(req.model.toObject());
  }
  create(req, res, next) {
    const Model = this.model;
    const model = new Model(req.body);
    model.timestamps = {
      created: {
        by: req.user.username
      }
    };
    model.save((err, model) => {
      if (err) return this.respondValidationError(err, res, next);
      else res.status(201).json(model.toObject());
    });
  }
  update(req, res, next) {
    const model = req.model;
    Object.keys(req.body).forEach((key) => {
      model[key] = req.body[key];
    });
    model.timestamps.updated.by = req.user.username;
    model.save((err, model) => {
      if (err) return this.respondValidationError(err, res, next);
      else return res.status(200).json(model.toObject());
    });
  }
  softDelete(req, res, next) {
    const model = req.model;
    model.mark.deleted = true;
    model.save((err, model) => {
      /* istanbul ignore if */
      if (err) {
        return res.status(400).json({
          error: {
            id: 'delete',
            message: err.message
          }
        });
      }
      else return res.status(200).jsonp(model.toObject());
    });
  }
  delete(req, res, next) {
    const model = req.model;
    model.remove((err) => {
      /* istanbul ignore if */
      if (err) {
        return res.status(400).json({
          error: {
            id: 'delete',
            message: err.message
          }
        });
      }
      else return res.status(200).jsonp(model.toObject());
    });
  }
  findById(req, res, next, id, urlParam, populate) {
    if (isValidId(id)) {
      /* istanbul ignore if */
      if (typeof populate === 'undefined' || !populate || !Array.isArray(populate))
      {
        populate = [];
      }

      this.model.findById(id).populate(populate).exec((err, model) => {
        /* istanbul ignore if */
        if (err) return this.respondServerError(res);
        if (!model) return this.respondNotFound(id, res);
        else {
          req.model = model;

          return next();
        }
      });
    } else return this.respondInvalidId(res);
  }
  stats(req, res, next) {
    this.model.count((err, result) => {
      if (err) return this.respondServerError(res, err);
      else {
        if (typeof req.stats !== 'object') req.stats = {};
        req.stats[this.model.collection.name] = result;

        return next();
      }
    });
  }
  statsResponse(req, res, next) {
    this.model.count((err, result) => {
      if (err) return this.respondServerError(res, err);
      else {
        if (typeof req.stats !== 'object') req.stats = {};

        return res.status(200).json(req.stats);
      }
    });
  }
  parseSort(sort) {
    try {
      sort = JSON.parse(sort);
    } catch (e) {
      /* istanbul ignore next */
      if (e.name === 'SyntaxError') {
        const field = sort;
        sort = {};
        sort[field] = 1;
      } else sort = {};
    }

    return sort;
  }
  parseFilter(query) {
    let filter = {};

    try {
      filter = JSON.parse(query.filter.replace(/\'/g, '"'));
    } catch (e) {
      filter = {};
    }

    this.filters.forEach(f => {
      if (typeof filter[f] !== 'undefined' && filter[f] !== null) {
        query[f] =  filter[f].toString();
      }
    });

    return query;
  }

}

module.exports = BaseController;
