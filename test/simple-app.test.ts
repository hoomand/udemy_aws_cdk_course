import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SimpleApp from '../lib/simple-app-stack';
import '@aws-cdk/assert/jest';

test('Stack create a S3 bucket', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SimpleApp.SimpleAppStack(app, 'MyTestStack');
    // THEN
    expect(stack).toHaveResource('AWS::S3::Bucket')
});
