import {
  createRequest,
  createResponse,
  MockRequest,
  MockResponse
} from 'node-mocks-http';
import {
  Schema,
  model
} from 'mongoose';
import BaseController from './base.controller';
import { IApiModel, IApiDocument } from './types';
import { IApiQuery } from './types/IApiQuery';

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
  property: String
});

describe('base.controller spec', () => {
  let mockModel: IApiModel;
  let controller: MockController;
  const statsResults = {
    statsOne: 0,
    statsTwo: 300,
    statsThree: -12,
  };
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

      expect(parsedSort).toEqual({ [mockSort]: 1 });
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
    beforeEach(() => {
      mockRequest = createRequest({});
      mockResponse = createResponse();
    });

    it('should append statistics to request if model has statistics function', () => {
      mockModel.statistics = jest.fn((_query, callback) => callback(null, statsResults));

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockRequest.stats[mockModel.collection.name]).toEqual(statsResults);
    });
    it('should not recreate stats object if already exists', () => {
      mockModel.statistics = jest.fn((_query, callback) => callback(null, statsResults));
      mockRequest.stats = {
        otherStats: 'something'
      };

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockRequest.stats[mockModel.collection.name]).toEqual(statsResults);
    });
    it('should respond with server error if error occurs', () => {
      const error = {
        id: 'error',
        message: 'message'
      };
      mockModel.statistics = jest.fn((_query, callback) => callback(error, null));

      controller.statistics(mockRequest, mockResponse, mockNext);

      expect(mockResponse.statusCode).toBe(500);
      expect(JSON.parse(mockResponse._getData())).toEqual({ error });
    });
    it('should append count of objects to request if model has no statistics function',
      () => {
        const nrOfDocuments = 111;
        mockModel.countDocuments =
          jest.fn((callback) => callback(null, nrOfDocuments));

        controller.statistics(mockRequest, mockResponse, mockNext);

        expect(mockRequest.stats[mockModel.collection.name]).toEqual(nrOfDocuments);
      });
    it(
      'should add minimal stats and not create stats if stats already exists on req',
      () => {
        const nrOfDocuments = 1000;
        mockRequest.stats = {
          otherStats: 'something'
        };
        mockModel.countDocuments =
          jest.fn((callback) => callback(null, nrOfDocuments));

        controller.statistics(mockRequest, mockResponse, mockNext);

        expect(mockRequest.stats[mockModel.collection.name]).toEqual(nrOfDocuments);
      });
    it('should respond with server error if error occurs', () => {
      const error = {
        id: 'error',
        message: 'message'
      };
      mockModel.countDocuments = jest.fn((callback) => callback(error, null));

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



});
