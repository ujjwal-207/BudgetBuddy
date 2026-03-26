export declare const monthExpression: (valueExpression: string) => string;
export declare const ensureDefaultsForUser: (client: {
    query: (sql: string, params?: any[]) => Promise<any>;
}, userId: number) => Promise<void>;
export declare const ensureSchema: (seedDefaults?: boolean) => Promise<void>;
//# sourceMappingURL=schema.d.ts.map