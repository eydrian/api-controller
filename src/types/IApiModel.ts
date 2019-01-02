import {
  Model,
  Document,
} from 'mongoose';
import { IApiQuery } from './IApiQuery';
import { IApiTimeStampModel } from './IApiTimestampModel';

export type statisticsCallbackFunction =
  (err: any | null, statistics: any | null) => void;
export type parseQueryFunction = (query: any) => IApiQuery;
export type computeStatisticsFunction =
  (query: IApiQuery, callback: statisticsCallbackFunction) => void;

export interface IApiDocument extends Document {
  timestamps: IApiTimeStampModel;
  [key: string]: any;
}

export interface IApiModel extends Model<IApiDocument> {
  parseQuery?: parseQueryFunction;
  statistics?: computeStatisticsFunction;
}
