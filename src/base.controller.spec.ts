import {
  createRequest,
  createResponse,
  MockRequest,
  MockResponse
} from 'node-mocks-http';
import {
  Schema,
  model,
  Types
} from 'mongoose';
import BaseController from './base.controller';
import { IApiMeta } from '../dist/types/IApiMeta';
import {
  IApiModel,
  IApiDocument,
  IApiQuery,
  IPopulate
} from './types';

interface IMockModel extends IApiModel {
  property?: string;
}
const mockFilters = ['propertyOne'];
class MockController extends BaseController<IMockModel> {
  constructor(_model: IMockModel) {
    super(_model);
    this.filters.push(...mockFilters);
  }
}

const mockSchema = new Schema({
  property: String,
  timestamps: {
    created: {
      at: {
        type: Date,
        default: Date.now
      },
      by: String
    },
    updated: {
      at: {
        type: Date,
        default: Date.now
      },
      by: String
    }
  },
  mark: {
    deleted: Boolean
  }
});

describe('base.controller spec', () => {
  let mockModel: IApiModel;
  let controller: MockController;
  const mockNext = (err?: any) => err;

  beforeEach(() => {
    mockModel = model<IApiDocument, IMockModel>('mockModel', mockSchema);
    controller = new MockController(mockModel);
  });

  describe('parseSort()', () => {
    it('should parse a sort string', () => {
      const parsedSort = controller.parseSort('type');

      expect(parsedSort).toEqual({type: 1});
    });
    it('should parse a sort object', () => {
      const parsedSort = controller.parseSort('{"property": -1}');

      expect(parsedSort).toEqual({property: -1});
    });
    it('should parse a sort object with string numbers', () => {
      const parsedSort = controller.parseSort('{"property": "-1"}');

      expect(parsedSort).toEqual({property: -1});
    });
    it('should parse a sort object with invalid numbers', () => {
      const parsedSort = controller.parseSort('{"property": "sort"}');

      expect(parsedSort).toEqual({property: 1});
    });
    it('should parse a sort object with multiple params', () => {
      const mockSort = {
        propertyOne: -1,
        propertyTwo: 1
      };
      const parsedSort = controller.parseSort(JSON.stringify(mockSort));

      expect(parsedSort).toEqual(mockSort);
    });
    it('should not fail on invalid string', () => {
      const mockSort = '\{"foo: 1';
      const parsedSort = controller.parseSort(mockSort);

      expect(parsedSort).toEqual({ '1': 1 });
    });
  });
  describe('parseFilter()', () => {
    it('should return original query, if no filters specified', () => {
      const mockQuery: IApiQuery = {
        limit: 0,
        offset: 0
      };
      const parsedQuery = controller.parseFilter(mockQuery);

      expect(parsedQuery).toEqual(mockQuery);
    });
    it('should parse filter for allowed properties', () => {
      const mockQuery: IApiQuery = {
        limit: 0,
        offset: 0,
        filter: `{"${ mockFilters[0] }": 'foo'}`
      };
      const parsedQuery = controller.parseFilter(mockQuery);

      const expectedQuery = Object.assign({}, mockQuery, { [mockFilters[0]]: 'foo'});

      expect(parsedQuery).toEqual(expectedQuery);
    });
    it('should not parse filter for not allowed properties', () => {
      const mockQuery: IApiQuery = {
        limit: 0,
        offset: 0,
        filter: `{"bar": 'foo'}`
      };
      const parsedQuery = controller.parseFilter(mockQuery);

      expect(parsedQuery).toEqual(mockQuery);
    });
    it('should not fail for invalid string', () => {
      const mockQuery: IApiQuery = {
        limit: 0,
        offset: 0,
        filter: `{"bar": 'foo`
      };
      const parsedQuery = controller.parseFilter(mockQuery);

      expect(parsedQuery).toEqual(mockQuery);
    });
  });
  describe('"parseDateRange() fills requests dataRange and stats"', () => {
    it('should be possible to parse date ranges from given year and month param', () => {
      const year = 2018;
      const month = 12;
      const mockRequest = createRequest({
        params: {
          year: year.toString(),
          month: month.toString()
        }
      });
      const mockResponse = createResponse();
      const from = new Date(year, month - 1, 1, 0, 0, 0);
      const to = new Date(year, month, 1, 0, 0, 0);
      const expectedDataRange = {
        $and: [{
          date: {
            $gte: from
          }
        }, {
          date: {
            $lt: to
          }
        }]
      };

      controller.parseDateRange(mockRequest, mockResponse, mockNext, '', '');
      expect(mockRequest.dateRange).toEqual(expectedDataRange);
      expect(mockRequest.stats.range).toEqual({from, to});
    });
    it('should be possible to parse date range from a year param', () => {
      const year = 2018;
      const mockRequest = createRequest({
        params: {
          year: year.toString()
        }
      });
      const mockResponse = createResponse();
      const from = new Date(year, 0, 1, 0, 0, 0);
      const to = new Date(year, 12, 1, 0, 0, 0);
      const expectedDataRange = {
        $and: [{
          date: {
            $gte: from
          }
        }, {
          date: {
            $lt: to
          }
        }]
      };

      controller.parseDateRange(mockRequest, mockResponse, mockNext, '', '');
      expect(mockRequest.dateRange).toEqual(expectedDataRange);
      expect(mockRequest.stats.range).toEqual({from, to});
    });
    it('should not fail to parse date range from an invalid year param', () => {
      const year = 'foo';
      const mockRequest = createRequest({
        params: {
          year: year.toString()
        }
      });
      const mockResponse = createResponse();

      controller.parseDateRange(mockRequest, mockResponse, mockNext, '', '');
      expect(mockRequest.dateRange).toBeFalsy();
      expect(mockRequest.stats).toBeFalsy();
    });
    it(
      'should not fail to parse date range from a valid year but invalid month param',
      () => {
        const year = 2019;
        const month = 'foo';
        const mockRequest = createRequest({
          params: {
            year: year.toString(),
            month: month
          },
          stats: {}
        });
        const mockResponse = createResponse();

        const from = new Date(year, 0, 1, 0, 0, 0);
        const to = new Date(year, 12, 1, 0, 0, 0);
        const expectedDataRange = {
          $and: [{
            date: {
              $gte: from
            }
          }, {
            date: {
              $lt: to
            }
          }]
        };

        controller.parseDateRange(mockRequest, mockResponse, mockNext, '', '');
        expect(mockRequest.dateRange).toEqual(expectedDataRange);
        expect(mockRequest.stats.range).toEqual({from, to});
      });
  });
  describe('"statistics()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let error: any;
    let statsResults: any;
    let nrOfDocuments: number;
    beforeEach(() => {
      mockRequest = createRequest({});
      mockResponse = createResponse();
      error = null;
      statsResults = {
        statsOne: 0,
        statsTwo: 300,
        statsThree: -12,
      };
      nrOfDocuments = 111;
      mockModel.statistics = jest.fn((_query, callback) => callback(error, statsResults));
      mockModel.countDocuments = jest.fn((callback) => callback(error, nrOfDocuments));
    });

    it('should append statistics to request if model has statistics function', () => {
      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockRequest.stats[mockModel.collection.name]).toEqual(statsResults);
    });
    it('should not recreate stats object if already exists', () => {
      mockRequest.stats = {
        otherStats: 'something'
      };

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockRequest.stats[mockModel.collection.name]).toEqual(statsResults);
    });
    it('should respond with server error if error occurs', () => {
      error = {
        id: 'error',
        message: 'message'
      };
      statsResults = null;

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(500);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });
    it('should append count of objects to request if model has no statistics function',
      () => {
        delete mockModel.statistics;

        controller.statistics(mockRequest, mockResponse, mockNext);

        expect(mockRequest.stats[mockModel.collection.name]).toEqual(nrOfDocuments);
      });
    it(
      'should add minimal stats and not create stats if stats already exists on req',
      () => {
        nrOfDocuments = 1000;
        statsResults = null;
        delete mockModel.statistics;
        mockRequest.stats = {
          otherStats: 'something'
        };
        controller.statistics(mockRequest, mockResponse, mockNext);

        expect(mockRequest.stats[mockModel.collection.name]).toEqual(nrOfDocuments);
      });
    it('should respond with server error if error occurs', () => {
      error = {
        id: 'error',
        message: 'message'
      };
      nrOfDocuments = null;
      statsResults = null;
      delete mockModel.statistics;

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(500);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });

    afterEach(() => {
      delete mockModel.statistics;
      delete mockModel.countDocuments;
    });
  });
  describe('"statsResponse()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    beforeEach(() => {
      mockRequest = createRequest({});
      mockResponse = createResponse();
    });
    it('should respond with stats', () => {
      controller.statsResponse(mockRequest, mockResponse, mockNext);

      expect(JSON.parse(mockResponse._getData())).toEqual({});
      expect(mockResponse.statusCode).toBe(200);
    });
    it('should not recreate stats if exists', () => {
      const stats = {
        this: 'that'
      };
      mockRequest.stats = stats;
      controller.statsResponse(mockRequest, mockResponse, mockNext);

      expect(JSON.parse(mockResponse._getData())).toEqual(stats);
    });
  });
  describe('"findById()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let _model: IApiDocument;
    let error: any;
    let populate: IPopulate;
    beforeEach(() => {
      mockRequest = createRequest({});
      mockResponse = createResponse();
      error = null;
      _model = new mockModel();
      mockModel.findById = jest.fn((_id) => {
        return {
          populate: function (foreignProperties: IPopulate[]) {
            foreignProperties.forEach(foreignProperty => {
              _model[foreignProperty.path] = foreignProperty.select;
            });
            return this;
          },
          exec: (callback: Function) => callback(error, _model)
        };
      });
    });

    it('should append model to request if it has a valid id', () => {
      const id = Types.ObjectId();
      _model = new mockModel({id: id});

      controller.findById(mockRequest, mockResponse, mockNext, id);

      expect(mockRequest.model).toEqual(_model);
    });
    it('should respond 500 if error occurs', () => {
      const id = Types.ObjectId();
      _model = null;
      error = {
        id: 'serverError',
        message: 'message'
     };

      controller.findById(mockRequest, mockResponse, mockNext, id);

      expect(mockResponse.statusCode).toBe(500);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });
    it('should return 404 if model not found', () => {
      const id = Types.ObjectId();
      const err = {
        id: 'notFound',
        message: `${ mockModel.modelName } ${ id } does not exist`
      };
      _model = null;

      controller.findById(mockRequest, mockResponse, mockNext, id);

      expect(mockResponse.statusCode).toBe(404);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error: err });
    });
    it('should return 400 if invalid model id', () => {
      error = {
        id: 'invalidId',
        message: 'Invalid id'
      };
      _model = null;

      controller.findById(mockRequest, mockResponse, mockNext, 'id');

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });
    it('should populate model with requested data', () => {
      const id = Types.ObjectId();
      populate = {
        path: 'foo',
        select: 'bar baz'
      };
      _model = new mockModel({id: id});

      controller.findById(mockRequest, mockResponse, mockNext, id, '', [populate]);

      expect(mockRequest.model).toHaveProperty(populate.path, populate.select);
    });

    afterEach(() => {
      delete mockModel.findById;
    });
  });
  describe('"index()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let error: any;
    let data: IApiDocument[] = [];
    let query: IApiQuery;
    beforeEach(() => {
      mockResponse = createResponse();
      mockResponse.query = {}; // a mock model to test against;
      error = null;
      data = [new mockModel(), new mockModel()];
      query = {
        q: {},
        offset: 0,
        limit: 100,
        populate: [],
        select: undefined,
        sort: undefined
      };
      mockModel.find = jest.fn((q: any) => {
        mockResponse.query.q = q;
        const mockFind = {
          limit: (limit: any) => {
            mockResponse.query.limit = limit;
            return mockFind;
          },
          skip: (skip: any) => {
            mockResponse.query.offset = skip;
            return mockFind;
          },
          sort: (sort: any) => {
            mockResponse.query.sort = sort;
            return mockFind;
          },
          select: (select: any) => {
            mockResponse.query.select = select;
            return mockFind;
          },
          populate: (populate: any) => {
            mockResponse.query.populate = populate;
            return mockFind;
          },
          exec: (callback: Function) => callback(error, data),
        };

        return mockFind;
      });
    });
    it('should return a list of models', () => {
      mockRequest = createRequest({});

      controller.index(mockRequest, mockResponse, mockNext);

      expect(mockRequest.data).toEqual(data);
      expect(mockResponse.query).toEqual(query);
    });
    it('should allow to change query', () => {
      query.offset = '10';
      query.limit = '10';
      mockRequest = createRequest({
        query
      });

      controller.index(mockRequest, mockResponse, mockNext);

      expect(mockResponse.query.offset).toEqual(parseInt(query.offset, 10));
      expect(mockResponse.query.limit).toEqual(parseInt(query.limit, 10));
    });
    it('should add sort and filters', () => {
      query.sort = 'type';
      query.filter = 'type';
      mockRequest = createRequest({
        query
      });

      controller.index(mockRequest, mockResponse, mockNext);

      expect(mockResponse.query.sort).toEqual({type: 1});
      /* don't check for filter, they are checked above  */
    });
    it('should call model parseQuery, if exists', () => {
      query.sort = 'type';
      query.filter = 'type';
      mockRequest = createRequest({
        query
      });

      mockModel.parseQuery = jest.fn((_query: IApiQuery) => {
        return _query;
      });

      controller.index(mockRequest, mockResponse, mockNext);

      expect(mockResponse.query.sort).toEqual({type: 1});
      /* don't check for filter, they are checked above */
    });
    it('should return error, if error occurs', () => {
      query.sort = 'type';
      query.filter = 'type';
      mockRequest = createRequest({
        query
      });
      error = {
        id: 'mockError',
        message: 'mockMessage'
      };

      controller.index(mockRequest, mockResponse, (err) => {
        expect(err).toEqual(error);
      });

      expect(mockResponse.query.sort).toEqual({type: 1});
      /* don't check for filter, they are checked above */
    });
  });
  describe('"read()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let _model: IApiDocument;
    beforeEach(() => {
      _model = new mockModel({property: 'bar'});
      mockResponse = createResponse();
    });
    it('should return model as json', () => {
      mockRequest = createRequest({
        model: _model
      });

      controller.read(mockRequest, mockResponse, mockNext);

      const clone = JSON.parse(JSON.stringify(_model.toObject())); // needs parsing of id
      expect(mockResponse.statusCode).toBe(200);
      expect(JSON.parse(mockResponse._getData())).toEqual(clone);
    });
    it('should return model not found if no model', () => {
      const err = {
        id: 'modelMissing',
        message: 'the model is missing in the request'
      };
      _model = null;
      mockRequest = createRequest({});

      controller.read(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error: err });

    });
  });
  describe('"create()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let body: any;
    const user = 'test';
    let error: any;
    let _model: IApiDocument;
    beforeEach(() => {
      error = null;
      body = {
        property: 'something'
      };
      mockResponse = createResponse();
      mockModel.prototype.save = jest.fn(function (callback) {
        return callback(error, this);
      });
      _model = new mockModel(body);
      mockRequest = createRequest({
        user: {
          username: user
        },
        body
      });
    });
    it('should create a model', () => {
      controller.create(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(201);
      const response = JSON.parse(mockResponse._getData());
      expect(response).toHaveProperty('property', body.property);
      expect(response).toHaveProperty('timestamps.created.by', user);
    });
    it('should return validation error if error occurs', () => {
      error = {
        name: 'ValidationError',
        id: 'validationError',
        message: 'the model has invalid properties',
        errors: 'fields'
      };

      controller.create(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({
        error: {
          id: error.id,
          message: error.message,
          fields: error.errors,
        }
      });
    });
    it('should return duplicate error if is duplication', () => {
      error = {
        code: 11000
      };

      controller.create(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({
        error: {
          id: 'duplicate',
          message: `${ mockModel.modelName } already exists`
        }
      });
    });
    it('should return next error, if not duplicate nor validation error', () => {
      error = {
        message: 'something'
      };
      controller.create(mockRequest, mockResponse, (err) => {
        expect(err).toEqual(error);
      });

    });
    it('should not allow to set timestamps or id', () => {
      body = {
        property: 'something else',
        _id: 5,
        id: 17,
        timestamps: {
          crated: {
            at: new Date(),
            by: 'someone'
          }
        }
      };
      _model = new mockModel(body);
      mockRequest = createRequest({
        user: {
          username: user
        },
        body
      });

      controller.create(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(201);
      const response = JSON.parse(mockResponse._getData());
      expect(response).toHaveProperty('property', body.property);
      expect(response).toHaveProperty('timestamps.created.by', user);
      expect(response).not.toHaveProperty('_id', body._id);
      expect(response).not.toHaveProperty('id', body.id);

    });
    afterEach(() => {
      delete _model.save;
    });
  });
  describe('"update()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let body: any;
    const user = 'test';
    let error: any;
    let _model: IApiDocument;
    beforeEach(() => {
      error = null;
      body = {
        property: 'something'
      };
      mockResponse = createResponse();
      mockModel.prototype.save = jest.fn(function (callback) {
        return callback(error, this);
      });
      _model = new mockModel({property: 'initial'});
      mockRequest = createRequest({
        user: {
          username: user
        },
        model: _model,
        body
      });
    });
    it('should update a model', () => {
      controller.update(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(200);
      const response = JSON.parse(mockResponse._getData());
      expect(response).toHaveProperty('property', body.property);
      expect(response).toHaveProperty('timestamps.updated.by', user);
    });
    it('should return validation error if error occurs', () => {
      error = {
        name: 'ValidationError',
        id: 'validationError',
        message: 'the model has invalid properties',
        errors: 'fields'
      };

      controller.update(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({
        error: {
          id: error.id,
          message: error.message,
          fields: error.errors,
        }
      });
    });
    it('should return next error, if its not a validation error', () => {
      error = {
        message: 'something'
      };
      controller.update(mockRequest, mockResponse, (err) => {
        expect(err).toEqual(error);
      });

    });
    it('should return model missing, if model is missing', () => {
      error = {
        id: 'modelMissing',
        message: 'the model is missing in the request'
      };
      mockRequest = createRequest({
        user: {
          username: user
        },
        body
      });

      controller.update(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });

    });
    it('should not allow to set timestamps or id', () => {
      body = {
        property: 'something else',
        _id: null,
        id: 17,
        timestamps: {
          crated: {
            at: new Date(),
            by: 'someone'
          }
        }
      };
      _model = new mockModel({property: 'initial'});
      mockRequest = createRequest({
        user: {
          username: user
        },
        model: _model,
        body
      });

      controller.update(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(200);
      const response = JSON.parse(mockResponse._getData());
      expect(response).toHaveProperty('property', body.property);
      expect(response).toHaveProperty('timestamps.updated.by', user);
      expect(response).not.toHaveProperty('_id', body._id);
      expect(response).not.toHaveProperty('id', body.id);

    });
    afterEach(() => {
      delete _model.save;
    });
  });
  describe('"softDelete()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let error: any;
    let _model: IApiDocument;
    const user = 'test';
    beforeEach(() => {
      error = null;
      mockResponse = createResponse();
      mockModel.prototype.save = jest.fn(function (callback) {
        return callback(error, this);
      });
      _model = new mockModel({property: 'something'});
      mockRequest = createRequest({
        model: _model,
        user: {
          username: user
        },
      });
    });
    it('should mark a model as deleted', () => {
      controller.softDelete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(200);
      const response = JSON.parse(mockResponse._getData());
      expect(response).toHaveProperty('mark.deleted', true);
    });
    it('should return deletion error if error occurs', () => {
      error = {
        id: 'delete',
        message: 'the model has invalid properties'
      };

      controller.softDelete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });
    it('should return model missing, if model is missing', () => {
      error = {
        id: 'modelMissing',
        message: 'the model is missing in the request'
      };
      mockRequest = createRequest({});

      controller.softDelete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });

    });
    afterEach(() => {
      delete _model.save;
    });
  });
  describe('"delete()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let error: any;
    let _model: IApiDocument;
    beforeEach(() => {
      error = null;
      mockResponse = createResponse();
      mockModel.prototype.remove = jest.fn(function (callback) {
        return callback(error, this);
      });
      _model = new mockModel({property: 'something'});
      mockRequest = createRequest({
        model: _model
      });
    });
    it('should remove a model', () => {
      controller.delete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(200);
      const response = JSON.parse(mockResponse._getData());
      expect(response._id.toString()).toEqual(_model._id.toString());
    });
    it('should return model missing, if model is missing', () => {
      error = {
        id: 'modelMissing',
        message: 'the model is missing in the request'
      };
      mockRequest = createRequest({});

      controller.delete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(400);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });

    });
    it('should return error if error occurs', () => {
      _model = new mockModel({property: 'something'});
      mockRequest = createRequest({
        model: _model
      });
      error = {
        id: 'mockError',
        message: 'mock message'
      };

      controller.delete(mockRequest, mockResponse, (err) => {
        expect(err).toEqual(error);
      });
    });
    afterEach(() => {
      delete _model.save;
    });
  });
  describe('"apiResponse()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let data: IApiDocument[] = [];
    let meta: IApiMeta;
    beforeEach(() => {
      mockResponse = createResponse();
      meta = {
        total: 100,
        count: 10,
        offset: 0,
        limit: 100
      };
      data = [new mockModel(), new mockModel()];
    });
    it('should generate an api response', () => {
      mockRequest = createRequest({
        data: data,
        meta: meta
      });

      controller.apiResponse(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(200);
      const response = JSON.parse(mockResponse._getData());
      expect(response.data.length).toEqual(data.length);
      expect(response.meta).toEqual(meta);
    });
    it('should return a 500 error on meta error', () => {
      meta.error = {
        id: 'foo',
        message: 'bar'
      };
      mockRequest = createRequest({
        data: data,
        meta: meta
      });

      controller.apiResponse(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(500);
      const response = JSON.parse(mockResponse._getData());
      expect(response.data.length).toEqual(data.length);
      expect(response.meta).toEqual(meta);
    });
  });
  describe('"populateMeta()"', () => {
    let mockRequest: MockRequest<any>;
    let mockResponse: MockResponse<any>;
    let data: IApiDocument[] = [];
    let error: any;
    let nrOfDocuments: number;
    beforeEach(() => {
      mockResponse = createResponse();
      error = null;
      data = [new mockModel(), new mockModel()];
      nrOfDocuments = 111;
      mockModel.countDocuments =
        jest.fn((_query, callback: Function) => callback(error, nrOfDocuments));
    });
    it('should append meta data to request with strings', () => {
      const offset = '10';
      const limit = '10';
      mockRequest = createRequest({
        data: data,
        query: {
          total: 'query',
          offset: offset,
          limit: limit
        }
      });

      controller.populateMeta(mockRequest, mockResponse, mockNext);

      expect(mockRequest.meta).toBeTruthy();
      expect(mockRequest.meta.total).toEqual(nrOfDocuments);
      expect(mockRequest.meta.count).toEqual(data.length);
      expect(mockRequest.meta.offset).toEqual(parseInt(offset, 10));
      expect(mockRequest.meta.limit).toEqual(parseInt(limit, 10));
    });
    it('should append meta data to request with numbers', () => {
      const offset = 10;
      const limit = 10;
      mockRequest = createRequest({
        data: data,
        query: {
          offset: offset,
          limit: limit
        }
      });

      controller.populateMeta(mockRequest, mockResponse, mockNext);

      expect(mockRequest.meta).toBeTruthy();
      expect(mockRequest.meta.total).toEqual(nrOfDocuments);
      expect(mockRequest.meta.count).toEqual(data.length);
      expect(mockRequest.meta.offset).toEqual(offset);
      expect(mockRequest.meta.limit).toEqual(limit);
    });
    it('should append meta data even if no data found', () => {
      const offset = 10;
      const limit = 10;
      mockRequest = createRequest({
        data: null,
        query: {
          offset: offset,
          limit: limit
        }
      });

      controller.populateMeta(mockRequest, mockResponse, mockNext);

      expect(mockRequest.meta).toBeTruthy();
      expect(mockRequest.meta.total).toEqual(nrOfDocuments);
      expect(mockRequest.meta.count).toEqual(0);
      expect(mockRequest.meta.offset).toEqual(offset);
      expect(mockRequest.meta.limit).toEqual(limit);
    });
    it('should return next, if error occurs', () => {
      mockRequest = createRequest({});
      error = {
        id: 'mockError',
        message: 'mockMessage'
      };

      controller.populateMeta(mockRequest, mockResponse, (err) => {
        expect(err).toEqual(error);
      });
    });
  });
  describe('"parsePagination()"', () => {
    it('should also parse pagination on a string value', () => {
      const mockValue = controller.parsePagination('10', '100');

      expect(mockValue).toBe(10);
    });
  });

});
