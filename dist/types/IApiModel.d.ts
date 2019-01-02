import { Model, Document } from 'mongoose';
import { IApiQuery } from './IApiQuery';
import { IApiTimeStampModel } from './IApiTimestampModel';
export declare type statisticsCallbackFunction = (err: any | null, statistics: any | null) => void;
export declare type parseQueryFunction = (query: any) => IApiQuery;
export declare type computeStatisticsFunction = (query: IApiQuery, callback: statisticsCallbackFunction) => void;
export interface IApiDocument extends Document {
    timestamps: IApiTimeStampModel;
    [key: string]: any;
}
export interface IApiModel extends Model<IApiDocument> {
    parseQuery?: parseQueryFunction;
    statistics?: computeStatisticsFunction;
}
//# sourceMappingURL=IApiModel.d.ts.map