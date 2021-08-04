export declare const Handler: (handler: string, config: any) => (ctx: any) => Promise<{
    bodyEncoding: string;
    body: any;
    headers: any;
    status: number;
} | {
    body: {
        config: any;
        error: any;
        result: {
            bodyEncoding: string;
            body: any;
            headers: any;
            status: number;
        } | undefined;
        ctx: any;
    };
}>;
//# sourceMappingURL=Handler.d.ts.map