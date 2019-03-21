import AWS  from 'aws-sdk';

export const Dynamo = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
});

export const IndexNames = {
    Resource: getPrefixedName('flexd-audit'),
    Timestamp: getPrefixedName('flexd-audit-timestamp'),
    Identity: getPrefixedName('flexd-audit-identity')
};

export function hexEncode(s: string): string {
    return Buffer.from(s, 'utf8').toString('hex');
}

function getPrefixedName(name: string) {
    return process.env.DEPLOYMENT_KEY ? `${process.env.DEPLOYMENT_KEY}-${name}` : name;
}
