"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const api_controller_1 = __importDefault(require("./api.controller"));
const helpers_1 = require("./helpers");
const isValidId = mongoose_1.Types.ObjectId.isValid;
class BaseController extends api_controller_1.default {
    constructor(model) {
        super(model);
        this.filters = ['type', 'deleted'];
    }
    index(req, _res, next) {
        let query = {
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
            .exec((err, models) => {
            if (err) {
                return next(err);
            }
            else {
                req.data = models;
                return next();
            }
        });
    }
    read(req, res, _next) {
        const response = req.model ? req.model.toObject() : {};
        return res.jsonp(response);
    }
    create(req, res, next) {
        delete req.body._id;
        delete req.body.timestamps;
        const Model = this.model;
        const model = new Model(req.body);
        model.timestamps = {
            created: {
                by: req.user.username
            }
        };
        model.save((err, resModel) => {
            if (err) {
                return this.respondValidationError(err, res, next);
            }
            else {
                res.status(201).json(resModel.toObject());
            }
        });
    }
    update(req, res, next) {
        if (req.body._id === null) {
            delete req.body._id;
        }
        delete req.body.timestamps;
        if (this.hasModel(req.model)) {
            const model = req.model;
            Object.keys(req.body).forEach((key) => {
                model[key] = req.body[key];
            });
            model.timestamps.updated.by = req.user.username;
            model.save((err, resModel) => {
                if (err) {
                    return this.respondValidationError(err, res, next);
                }
                else {
                    const response = resModel.toObject ? resModel.toObject() : resModel;
                    return res.status(200).json(response);
                }
            });
        }
        else {
            return this.respondModelMissingError(res);
        }
    }
    softDelete(req, res, _next) {
        if (this.hasModel(req.model)) {
            const model = req.model;
            model.mark.deleted = true;
            model.save((err, resModel) => {
                if (err) {
                    const error = {
                        id: 'delete',
                        message: err.message
                    };
                    return res.status(400).json({
                        error: error
                    });
                }
                else {
                    const response = resModel.toObject ? resModel.toObject() : resModel;
                    return res.status(200).jsonp(response);
                }
            });
        }
        else {
            return this.respondModelMissingError(res);
        }
    }
    delete(req, res, _next) {
        if (this.hasModel(req.model)) {
            const model = req.model;
            model.remove((err) => {
                if (err) {
                    const error = {
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
        }
        else {
            return this.respondModelMissingError(res);
        }
    }
    findById(req, res, next, id, _urlParam, populate) {
        if (isValidId(id)) {
            if (typeof populate === 'undefined' || !populate || !Array.isArray(populate)) {
                populate = [];
            }
            this.model.findById(id).populate(populate).exec((err, model) => {
                if (err) {
                    return this.respondServerError(res);
                }
                if (!model) {
                    return this.respondNotFound(id, res, this.model.modelName);
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
    }
    stats(req, res, next) {
        this.model.countDocuments((err, result) => {
            if (err) {
                return this.respondServerError(res, err);
            }
            else {
                if (typeof req.stats !== 'object') {
                    req.stats = {};
                }
                req.stats[this.model.collection.name] = result;
                return next();
            }
        });
    }
    statsResponse(req, res, _next) {
        if (typeof req.stats !== 'object') {
            req.stats = {};
        }
        return res.status(200).json(req.stats);
    }
    statistics(req, res, next) {
        if (typeof this.model.statistics === 'function') {
            const query = req.dateRange || {};
            this.model.statistics(query, (err, result) => {
                if (err) {
                    return this.respondServerError(res, err);
                }
                else {
                    if (typeof req.stats !== 'object') {
                        req.stats = {};
                    }
                    req.stats[this.model.collection.name] = result;
                    return next();
                }
            });
        }
        else {
            return this.stats(req, res, next);
        }
    }
    parseDateRange(req, _res, next, _id, _urlParam) {
        const year = parseInt(req.params.year, 10);
        let month = parseInt(req.params.month, 10);
        let toMonth = 12;
        if (!isNaN(year)) {
            if (isNaN(month)) {
                month = 0;
            }
            else {
                month = Math.max(Math.min(month, 12), 1);
                toMonth = --month + 1;
            }
            let from = new Date();
            from = new Date(from.setFullYear(year, month, 1));
            from = new Date(from.setHours(0, 0, 0, 0));
            let to = new Date(from.valueOf());
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
    }
    parseSort(sort) {
        const parsedSort = {};
        try {
            const _sort = JSON.parse(sort);
            Object.keys(_sort).forEach((key) => {
                parsedSort[key] = parseInt(_sort[key], 10);
            });
        }
        catch (e) {
            if (e.name === 'SyntaxError') {
                const field = sort;
                parsedSort[field] = 1;
            }
        }
        return parsedSort;
    }
    parseFilter(query) {
        let filter = {};
        try {
            filter = query.filter ? JSON.parse(query.filter.replace(/\'/g, '"')) : {};
        }
        catch (e) {
            filter = {};
        }
        this.filters.forEach(f => {
            if (typeof filter[f] !== 'undefined' && filter[f] !== null) {
                query[f] = filter[f].toString();
            }
        });
        return query;
    }
    parsePagination(field, boundary) {
        const value = helpers_1.isString(field) ? parseInt(field, 10) : field;
        return isNaN(value) ? boundary : value;
    }
}
exports.default = BaseController;
//# sourceMappingURL=base.controller.js.map