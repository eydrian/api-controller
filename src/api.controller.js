"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var isString_1 = require("./helpers/isString");
var ApiController = (function () {
    function ApiController(model) {
        this.model = model;
    }
    ApiController.prototype.respondServerError = function (res, error) {
        var serverError = {
            id: 'serverError',
            message: "failed to get " + this.model.modelName
        };
        return res.status(500).json({
            error: error || serverError
        });
    };
    ApiController.prototype.respondNotFound = function (id, res, modelName) {
        var error = {
            id: 'notFound',
            message: (modelName || this.model.modelName) + " " + id + " does not exist"
        };
        return res.status(404).json({
            error: error
        });
    };
    ApiController.prototype.respondInvalidId = function (res) {
        var error = {
            id: 'invalidId',
            message: 'Invalid id'
        };
        return res.status(400).json({
            error: error
        });
    };
    ApiController.prototype.respondModelMissingError = function (res) {
        var error = {
            id: 'modelMissing',
            message: 'the model is missing in the request'
        };
        return res.status(400).json({
            error: error
        });
    };
    ApiController.prototype.respondValidationError = function (err, res, next) {
        if (err.name === 'ValidationError') {
            var error = {
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
                    message: this.model.modelName + " already exists"
                },
            });
        }
        else {
            return next(err);
        }
    };
    ApiController.prototype.apiResponse = function (req, res, _next) {
        var hasMetaError = req.meta && req.meta.error;
        var status = 200;
        if (hasMetaError) {
            status = 500;
        }
        return res.status(status).json({ meta: req.meta, data: req.data });
    };
    ApiController.prototype.populateMeta = function (req, _res, next) {
        var qTotal = req.query.total || {};
        this.model.countDocuments(qTotal, function (err, total) {
            if (err) {
                return next(err);
            }
            else {
                var offset = req.query.offset;
                var limit = req.query.limit;
                req.meta = {
                    total: total,
                    count: req.data ? req.data.length : 0,
                    offset: isString_1.isString(offset) ? parseInt(offset, 10) : offset,
                    limit: isString_1.isString(limit) ? parseInt(limit, 10) : limit
                };
                return next();
            }
        });
    };
    ApiController.prototype.hasModel = function (model) {
        return typeof model !== 'undefined';
    };
    return ApiController;
}());
exports.default = ApiController;
//# sourceMappingURL=api.controller.js.map