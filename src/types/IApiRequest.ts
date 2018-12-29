import { Request } from 'express';
import { IApiQuery } from './IApiQuery';
import { IApiMeta } from './IApiMeta';

export interface IApiRequest extends Request {
  query: IApiQuery;
  meta?: IApiMeta;
  data?: any[];
  stats?: any;
  model?: any;
  user?: any;
  dateRange?: any;
}

