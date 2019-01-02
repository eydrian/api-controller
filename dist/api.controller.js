"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isString_1 = require("./helpers/isString");
class ApiController {
    constructor(model) {
        this.model = model;
    }
    respondServerError(res, error) {
        return res.status(500).json({ error });
    }
    respondNotFound(id, res, modelName) {
        const error = {
            id: 'notFound',
            message: `${modelName} ${id} does not exist`
        };
        return res.status(404).json({
            error: error
        });
    }
    respondInvalidId(res) {
        const error = {
            id: 'invalidId',
            message: 'Invalid id'
        };
        return res.status(400).json({
            error: error
        });
    }
    respondModelMissingError(res) {
        const error = {
            id: 'modelMissing',
            message: 'the model is missing in the request'
        };
        return res.status(400).json({
            error: error
        });
    }
    respondDeletionError(res, err) {
        const error = {
            id: 'delete',
            message: err.message
        };
        return res.status(400).json({
            error: error
        });
    }
    respondValidationError(err, res, next) {
        if (err.name === 'ValidationError') {
            const error = {
                id: 'validationError',
                message: err.message,
                fields: err.errors
            };
            return res.status(400).json({
                error: error
            });
        }
        if (err.code === 11000) {
            return res.status(400).json({
                error: {
                    id: 'duplicate',
                    message: `${this.model.modelName} already exists`
                },
            });
        }
        else {
            return next(err);
        }
    }
    apiResponse(req, res, _next) {
        const hasMetaError = req.meta && req.meta.error;
        let status = 200;
        if (hasMetaError) {
            status = 500;
        }
        return res.status(status).json({ meta: req.meta, data: req.data });
    }
    populateMeta(req, _res, next) {
        const qTotal = req.query.total || {};
        this.model.countDocuments(qTotal, (err, total) => {
            if (err) {
                return next(err);
            }
            else {
                const offset = req.query.offset;
                const limit = req.query.limit;
                req.meta = {
                    total: total,
                    count: req.data ? req.data.length : 0,
                    offset: isString_1.isString(offset) ? parseInt(offset, 10) : offset,
                    limit: isString_1.isString(limit) ? parseInt(limit, 10) : limit
                };
                return next();
            }
        });
    }
    hasModel(model) {
        return typeof model !== 'undefined';
    }
}
exports.default = ApiController;
//# sourceMappingURL=api.controller.js.map