'use strict';

class ApiController {
  constructor(model) {
    /* istanbul ignore if */
    if (new.target === ApiController) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
    this.model = model;
  }

  // ERROR Responses
  respondServerError(res, error) {
    error = error || {
      id: 'servererror',
      message: `failed to get ${ this.model.modelName }`
    };

    return res.status(500).json({
      error: error
    });
  }
  respondNotFound(id, res, modelName) {
    return res.status(404).json({
      error: {
        id: 'notfound',
        message: `${ modelName || this.model.modelName } ${ id } does not exist`
      }
    });
  }
  respondInvalidId(res) {
    return res.status(400).json({
      error: {
        id: 'invalidid',
        message: 'Invalid id'
      }
    });
  }
  respondValidationError(err, res, next) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          id: 'validationerror',
          message: err.message,
          fields: err.errors
        }
      });
    }
    /* istanbul ignore else */
    if (err.code === 11000) {return res.status(400).json({
      error: {
        id: 'duplicate',
        message: `${ this.model.modelName } already exists`
      },
    });}
    else return next(err);
  }
  apiResponse(req, res, next) {
    const hasMetaError = req.meta && req.meta.error;
    let status = 200;
    /* istanbul ignore if */
    if (hasMetaError) status = 500;

    return res.status(status).json({ meta: req.meta, data: req.data });
  }
  populateMeta(req, res, next) {
    const total = req.query.total || {};

    return this.model.count(total, (err, total) => {
      /* istanbul ignore if */
      if (err) return next(err);
      else {
        req.meta = {
          total: total,
          count: req.data ? req.data.length : /* istanbul ignore next */ null,
          offset: req.query.offset || 0,
        };

        return next();
      }
    });
  }
}

module.exports = ApiController;
