import { IndexNames, Dynamo, hexEncode } from './Common';
import * as Async from 'async';
import createError from 'http-errors';
import { optionalCallExpression, file } from '@babel/types';
import { strict } from 'assert';
import { COPYFILE_EXCL } from 'constants';
import { DynamoDB } from 'aws-sdk';

const DefaultQuery = {
    from: '-15m',
}

const TimeConstuctors: { [property: string]: (t: number) => number } = {
    d: (t: number) => new Date(new Date().getTime() - t * 24 * 60 * 60000).getTime(),
    h: (t: number) => new Date(new Date().getTime() - t * 60 * 60000).getTime(),
    m: (t: number) => new Date(new Date().getTime() - t * 60000).getTime(),
    s: (t: number) => new Date(new Date().getTime() - t * 1000).getTime(),
};

export function readAudit(): (req: any, res: any, next: any) => void {
    return function readAuditHandler(req, res, next) {
        let ctx: any = {
            query: {
                ...DefaultQuery,
                ...req.query,
                accountId: req.params.accountId,
            }
        };

        return Async.series([
            cb => validateAndNormalizeQuery(ctx, cb),
            cb => computeQueryPlan(ctx, cb),
            cb => runQuery(ctx, cb),
        ], e => {
            if (e) return next(createError(e));
            res.json(ctx.result);
        });
    }
};

function runQuery(ctx: any, cb: (e?: Error) => void) {
    // console.log('RUNNING QUERY', ctx.plan);
    return Dynamo.query(ctx.plan, (e,d) => {
        //@ts-ignore
        // console.log('RESULT', e,d);
        if (e) return cb(createError(e));
        ctx.result = { };
        (<DynamoDB.AttributeMap[]>d.Items).sort((a,b) => +<string>a.timestamp.N - +<string>b.timestamp.N);
        ctx.result.items = (<DynamoDB.AttributeMap[]>d.Items).map(i => {
            return {
                timestamp: new Date(+<string>i.timestamp.N).toISOString(),
                accountId: i.accountId.S,
                issuer: i.issuer.S,
                subject: i.subject.S,
                action: i.action.S,
                resource: (<string>i.resource.S).split('#')[0],
            };
        });
        if (d.LastEvaluatedKey) {
            ctx.result.next = Buffer.from(JSON.stringify(d.LastEvaluatedKey), 'utf8').toString('hex');
        }
        return cb();
    });
}

function computeQueryPlan(ctx: any, cb: (e?: Error) => void) {
    let indexToUse: string;
    if (ctx.query.resource) {
        ctx.plan = resourceQueryPlan(ctx);
    }
    else if (ctx.query.identity) {
        ctx.plan = identityQueryPlan(ctx);
    }
    else if (ctx.query.from) {
        ctx.plan = timestampQueryPlan(ctx);
    }
    else {
        ctx.plan = resourceQueryPlan(ctx);
    }

    if (ctx.query.count) {
        ctx.plan.Limit = ctx.query.count;
    }
    if (ctx.query.next) {
        ctx.plan.ExclusiveStartKey = ctx.query.next;
    }

    return cb();
}

function resourceQueryPlan(ctx: any): DynamoDB.QueryInput {
    let query: any = {
        TableName: IndexNames.Resource,
        ExpressionAttributeNames: {
        },
        ExpressionAttributeValues: {
            ':accountId': { S: ctx.query.accountId }
        },
        KeyConditionExpression: "accountId = :accountId",
    };
    if (ctx.query.resource) {
        query.ExpressionAttributeValues[':resourcePrefix'] = { S: ctx.query.resource };
        query.ExpressionAttributeNames['#resource'] = 'resource';
        query.KeyConditionExpression += ' AND begins_with(#resource, :resourcePrefix)';
    }
    let filterExpression: string[] = [];
    if (ctx.query.from) {
        query.ExpressionAttributeValues[':from'] = { N: ctx.query.from.toString() };
        query.ExpressionAttributeNames['#timestamp'] = 'timestamp';
        filterExpression.push('#timestamp >= :from');
    }
    if (ctx.query.to) {
        query.ExpressionAttributeValues[':to'] = { N: ctx.query.to.toString() };
        query.ExpressionAttributeNames['#timestamp'] = 'timestamp';
        filterExpression.push('#timestamp <= :to');
    }
    if (ctx.query.action) {
        query.ExpressionAttributeValues[':action'] = { S: ctx.query.action };
        query.ExpressionAttributeNames['#action'] = 'action';
        filterExpression.push('#action = :action');
    }
    if (ctx.query.issuer) {
        query.ExpressionAttributeValues[':issuer'] = { S: ctx.query.issuer };
        filterExpression.push('issuer = :issuer');
    }
    if (ctx.query.subject) {
        query.ExpressionAttributeValues[':subject'] = { S: ctx.query.subject };
        filterExpression.push('subject = :subject');
    }
    if (filterExpression.length > 0) {
        query.FilterExpression = filterExpression.join(' AND ');
    }
    return query;
}

function identityQueryPlan(ctx: any): DynamoDB.QueryInput {
    let query: any = {
        TableName: IndexNames.Resource,
        IndexName: IndexNames.Identity,
        ExpressionAttributeNames: {
        },
        ExpressionAttributeValues: {
            ':accountId': { S: ctx.query.accountId },
            ':identity': { S: ctx.query.identity }
        },
        KeyConditionExpression: "accountId = :accountId AND begins_with(identity, :identity)",
    };
    let filterExpression: string[] = [];
    if (ctx.query.resource) {
        query.ExpressionAttributeValues[':resourcePrefix'] = { S: ctx.query.resource };
        query.ExpressionAttributeNames['#resource'] = 'resource';
        filterExpression.push('begins_with(#resource, :resourcePrefix)');
    }
    if (ctx.query.from) {
        query.ExpressionAttributeValues[':from'] = { N: ctx.query.from.toString() };
        query.ExpressionAttributeNames['#timestamp'] = 'timestamp';
        filterExpression.push('#timestamp >= :from');
    }
    if (ctx.query.to) {
        query.ExpressionAttributeValues[':to'] = { N: ctx.query.to.toString() };
        query.ExpressionAttributeNames['#timestamp'] = 'timestamp';
        filterExpression.push('#timestamp <= :to');
    }
    if (ctx.query.action) {
        query.ExpressionAttributeValues[':action'] = { S: ctx.query.action };
        query.ExpressionAttributeNames['#action'] = 'action';
        filterExpression.push('#action = :action');
    }
    if (ctx.query.issuer) {
        query.ExpressionAttributeValues[':issuer'] = { S: ctx.query.issuer };
        filterExpression.push('issuer = :issuer');
    }
    if (ctx.query.subject) {
        query.ExpressionAttributeValues[':subject'] = { S: ctx.query.subject };
        filterExpression.push('subject = :subject');
    }
    if (filterExpression.length > 0) {
        query.FilterExpression = filterExpression.join(' AND ');
    }
    return query;    
}

function timestampQueryPlan(ctx: any): DynamoDB.QueryInput {
    let query: any = {
        TableName: IndexNames.Resource,
        IndexName: IndexNames.Timestamp,
        ExpressionAttributeNames: {
            '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':accountId': { S: ctx.query.accountId },
            ':from': { N: ctx.query.from.toString() },
        },
        KeyConditionExpression: "accountId = :accountId AND #timestamp >= :from",
    };
    if (ctx.query.to) {
        query.ExpressionAttributeValues[':to'] = { N: ctx.query.to.toString() };
        query.KeyConditionExpression += ' AND #timestamp <= :to';
    }
    let filterExpression: string[] = [];
    if (ctx.query.resource) {
        query.ExpressionAttributeValues[':resourcePrefix'] = { S: ctx.query.resource };
        query.ExpressionAttributeNames['#resource'] = 'resource';
        filterExpression.push('begins_with(#resource, :resourcePrefix)');
    }
    if (ctx.query.action) {
        query.ExpressionAttributeValues[':action'] = { S: ctx.query.action };
        query.ExpressionAttributeNames['#action'] = 'action';
        filterExpression.push('#action = :action');
    }
    if (filterExpression.length > 0) {
        query.FilterExpression = filterExpression.join(' AND ');
    }
    return query;    
    
}

function validateAndNormalizeQuery(ctx: any, cb: (e?: Error) => void) {
    try {
        ctx.query.from = parseTime(ctx.query.from);
    }
    catch (e) {
        return cb(createError(400, `Unsupported value of "from". You can specify a date/time, or say "-15m", "-2h", etc.`));
    }
    try {
        ctx.query.to = parseTime(ctx.query.to);
    }
    catch (e) {
        return cb(createError(400, `Unsupported value of "to". You can specify a date/time, or say "-15m", "-2h", etc.`));
    }
    if (ctx.query.count) {
        if (isNaN(ctx.query.count) || +ctx.query.count <= 0) {
            return cb(createError(400, 'The "count" value must be a positive integer.'));
        }
        ctx.query.count = +ctx.query.count;
    }
    if (ctx.query.to && ctx.query.to <= ctx.query.from) {
        return cb(createError(400, 'The "from" value must be before the "to" value. If not specified, the default value of "from" is -15m.'));
    }
    if (ctx.query.subject && !ctx.query.issuer) {
        return cb(createError(400, 'When "subject" is specified, "issuer" must also be specified.'));
    }
    if (ctx.query.next) {
        try {
            ctx.query.next = JSON.parse(Buffer.from(ctx.query.next, 'hex').toString('utf8'));
        }
        catch (_) {
            return cb(createError(400, 'Invalid "next" parameter.'));
        }
    }
    if (ctx.query.issuer) {
        ctx.query.identity = `${hexEncode(ctx.query.issuer)}/`;
        if (ctx.query.subject) {
            ctx.query.identity += `${hexEncode(ctx.query.subject)}/`;
        }
    }
    else {
        ctx.query.identity = undefined;
    }
    if (ctx.query.resource && ctx.query.resource[ctx.query.resource.length - 1] !== '/') {
        ctx.query.resource += '/';
    }
    return cb();
}

function parseTime(t?: string) {
    if (!t) return undefined;
    let match = t.match(/^\-(\d+)([mshd])$/);
    if (match) {
        return TimeConstuctors[match[2]](+match[1]);
    }
    else {
        return new Date(t);
    }
}
