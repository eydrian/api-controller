import {
  Schema,
  model
} from 'mongoose';
import BaseController from './base.controller';
import { IApiModel, IApiDocument } from './types';
import { IApiQuery } from './types/IApiQuery';
import { IApiRequest } from './types/IApiRequest';
import { Request } from 'express';
import { IncomingMessage } from 'http';

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
  let controller: MockController;
  beforeEach(() => {

    const mockModel: IApiModel = model<IApiDocument, IMockModel>('User', mockSchema);

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
  // describe('"parseDateRange()"', () => {
  //   it('should be possible to parse date ranges', (done) => {
  //     const req = new IncomingMessage(null);
  //     // const mockRequest: IApiRequest = Object.assign({}, req, {
  //     //   req,
  //     //   body: {},
  //     //   cookies: {},
  //     //   query: {
  //     //     limit: 0,
  //     //     offset: 0
  //     //   },
  //     //   params: {},
  //     // };

  //     controller.parseDateRange(req, {}, mockNext, '', '');

  //     function mockNext(req, _res: any): any {
  //       expect(req.dateRange).toEqual('foo');

  //       return done();
  //     }
  //   });
  // });

});

