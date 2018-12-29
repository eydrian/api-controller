export interface IApiQuery {
    populate?: [{
        select: 'string';
        path: 'string';
    }] | [];
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