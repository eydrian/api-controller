"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var api_controller_server_1 = __importDefault(require("./api.controller.server"));
var helpers_1 = require("./helpers");
var isValidId = mongoose_1.Types.ObjectId.isValid;
var BaseController = (function (_super) {
    __extends(BaseController, _super);
    function BaseController(model) {
        var _this = _super.call(this, model) || this;
        _this.filters = ['type', 'deleted'];
        return _this;
    }
    BaseController.prototype.index = function (req, _res, next) {
        var query = {
            offset: 0,
            limit: 0
        };
        req.query.offset = this.parsePagination(req.query.offset, 0);
        req.query.limit = this.parsePagination(req.query.limit, 100);
        if (req.query.sort) {
            req.query.sort = this.parseSort(req.query.sort);
        }
        if (req.query.filter) {
            req.query = this.parseFilter(req.query);
        }
        if (typeof this.model.parseQuery === 'function') {
            query = this.model.parseQuery(req.query);
        }
        if (!query.populate || !Array.isArray(query.populate)) {
            query.populate = [];
        }
        return this.model.find(query.q)
            .limit(helpers_1.toNumber(query.limit))
            .skip(helpers_1.toNumber(query.offset))
            .sort(query.sort)
            .select(query.select)
            .populate(query.populate)
            .exec(function (err, models) {
            if (err) {
                return next(err);
            }
            else {
                req.data = models;
                return next();
            }
        });
    };
    BaseController.prototype.read = function (req, res, _next) {
        return res.jsonp(req.model.toObject());
    };
    BaseController.prototype.create = function (req, res, next) {
        var _this = this;
        delete req.body._id;
        delete req.body.timestamps;
        var Model = this.model;
        var model = new Model(req.body);
        model.timestamps = {
            created: {
                by: req.user.username
            }
        };
        model.save(function (err, resModel) {
            if (err) {
                return _this.respondValidationError(err, res, next);
            }
            else {
                res.status(201).json(resModel.toObject());
            }
        });
    };
    BaseController.prototype.update = function (req, res, next) {
        var _this = this;
        if (req.body._id === null) {
            delete req.body._id;
        }
        delete req.body.timestamps;
        var model = req.model;
        Object.keys(req.body).forEach(function (key) {
            model[key] = req.body[key];
        });
        model.timestamps.updated.by = req.user.username;
        model.save(function (err, resModel) {
            if (err) {
                return _this.respondValidationError(err, res, next);
            }
            else {
                var response = resModel.toObject ? resModel.toObject() : resModel;
                return res.status(200).json(response);
            }
        });
    };
    BaseController.prototype.softDelete = function (req, res, _next) {
        var model = req.model;
        model.mark.deleted = true;
        model.save(function (err, resModel) {
            if (err) {
                var error = {
                    id: 'delete',
                    message: err.message
                };
                return res.status(400).json({
                    error: error
                });
            }
            else {
                var response = resModel.toObject ? resModel.toObject() : resModel;
                return res.status(200).jsonp(response);
            }
        });
    };
    BaseController.prototype.delete = function (req, res, _next) {
        var model = req.model;
        model.remove(function (err) {
            if (err) {
                var error = {
                    id: 'delete',
                    message: err.message
                };
                return res.status(400).json({
                    error: error
                });
            }
            else {
                return res.status(200).jsonp(model.toObject());
            }
        });
    };
    BaseController.prototype.findById = function (req, res, next, id, _urlParam, populate) {
        var _this = this;
        if (isValidId(id)) {
            if (typeof populate === 'undefined' || !populate || !Array.isArray(populate)) {
                populate = [];
            }
            this.model.findById(id).populate(populate).exec(function (err, model) {
                if (err) {
                    return _this.respondServerError(res);
                }
                if (!model) {
                    return _this.respondNotFound(id, res, _this.model.modelName);
                }
                else {
                    req.model = model;
                    return next();
                }
            });
        }
        else {
            return this.respondInvalidId(res);
        }
    };
    BaseController.prototype.stats = function (req, res, next) {
        var _this = this;
        this.model.countDocuments(function (err, result) {
            if (err) {
                return _this.respondServerError(res, err);
            }
            else {
                if (typeof req.stats !== 'object') {
                    req.stats = {};
                }
                req.stats[_this.model.collection.name] = result;
                return next();
            }
        });
    };
    BaseController.prototype.statsResponse = function (req, res, _next) {
        if (typeof req.stats !== 'object') {
            req.stats = {};
        }
        return res.status(200).json(req.stats);
    };
    BaseController.prototype.statistics = function (req, res, next) {
        var _this = this;
        if (typeof this.model.statistics === 'function') {
            var query = req.dateRange || {};
            this.model.statistics(query, function (err, result) {
                if (err) {
                    return _this.respondServerError(res, err);
                }
                else {
                    if (typeof req.stats !== 'object') {
                        req.stats = {};
                    }
                    req.stats[_this.model.collection.name] = result;
                    return next();
                }
            });
        }
        else {
            return this.stats(req, res, next);
        }
    };
    BaseController.prototype.parseDateRange = function (req, _res, next, _id, _urlParam) {
        var year = parseInt(req.params.year, 10);
        var month = parseInt(req.params.month, 10);
        var toMonth = 12;
        if (!isNaN(year)) {
            if (isNaN(month)) {
                month = 0;
            }
            else {
                month = Math.max(Math.min(month, 12), 1);
                toMonth = --month + 1;
            }
            var from = new Date();
            from = new Date(from.setFullYear(year, month, 1));
            from = new Date(from.setHours(0, 0, 0, 0));
            var to = new Date(from.valueOf());
            to = new Date(to.setFullYear(year, toMonth, 1));
            if (typeof req.stats !== 'object') {
                req.stats = {};
            }
            req.stats.range = {
                from: from,
                to: to
            };
            req.dateRange = { $and: [{ date: { $gte: from } }, { date: { $lt: to } }] };
        }
        return next();
    };
    BaseController.prototype.parseSort = function (sort) {
        var parsedSort = {};
        try {
            var _sort_1 = JSON.parse(sort);
            Object.keys(_sort_1).forEach(function (key) {
                parsedSort[key] = parseInt(_sort_1[key], 10);
            });
        }
        catch (e) {
            if (e.name === 'SyntaxError') {
                var field = sort;
                parsedSort[field] = 1;
            }
        }
        return parsedSort;
    };
    BaseController.prototype.parseFilter = function (query) {
        var filter = {};
        try {
            filter = query.filter ? JSON.parse(query.filter.replace(/\'/g, '"')) : {};
        }
        catch (e) {
            filter = {};
        }
        this.filters.forEach(function (f) {
            if (typeof filter[f] !== 'undefined' && filter[f] !== null) {
                query[f] = filter[f].toString();
            }
        });
        return query;
    };
    BaseController.prototype.parsePagination = function (field, boundary) {
        var value = helpers_1.isString(field) ? parseInt(field, 10) : field;
        return isNaN(value) ? boundary : value;
    };
    return BaseController;
}(api_controller_server_1.default));
exports.default = BaseController;
//# sourceMappingURL=base.controller.server.js.map