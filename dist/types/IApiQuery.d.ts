export interface IPopulate {
    select: string;
    path: string;
}
export interface IApiQuery {
    populate?: IPopulate[] | [];
    q?: any;
    limit: string | number;
    offset: string | number;
    sort?: any;
    select?: string;
    filter?: string;
    total?: string | number;
    [key: string]: any;
}
//# sourceMappingURL=IApiQuery.d.ts.map