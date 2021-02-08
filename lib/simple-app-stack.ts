import { Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { Runtime } from "@aws-cdk/aws-lambda";
import * as path from "path";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";

export class SimpleAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "CDKTrainingBucket", {
      encryption: BucketEncryption.S3_MANAGED,
    });

    new BucketDeployment(this, "MySimpleAppPhotos", {
      sources: [Source.asset(path.join(__dirname, "..", "photos"))],
      destinationBucket: bucket,
    });

    const getPhotos = new lambda.NodejsFunction(this, "MySimpleAppLambda", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "get-photos", "index.ts"),
      handler: "getPhotos",
      environment: {
        PHOTO_BUCKET_NAME: bucket.bucketName, // Passing the bucket name as env variable to our external lambda
      },
    });

    // Define bucket access policy
    const bucketContainerPermissions = new PolicyStatement();
    bucketContainerPermissions.addResources(bucket.bucketArn);
    bucketContainerPermissions.addActions("s3:ListBucket");

    const bucketPermissions = new PolicyStatement();
    bucketPermissions.addResources(`${bucket.bucketArn}/*`);
    bucketPermissions.addActions("s3:GetObject", "s3:PutObject");

    // Adding bucket access permission to the lambda function
    getPhotos.addToRolePolicy(bucketContainerPermissions);
    getPhotos.addToRolePolicy(bucketPermissions);

    const httpApi = new HttpApi(this, "MySimpleAppHTTPAPI", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [HttpMethod.GET],
      },
      apiName: "photo-api",
      createDefaultStage: true,
    });

    const lambdaIntegration = new LambdaProxyIntegration({
      handler: getPhotos,
    });

    httpApi.addRoutes({
      path: "/getAllPhotos",
      methods: [HttpMethod.GET],
      integration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, "MySimpleAppBucketNameExport", {
      value: bucket.bucketName,
      exportName: "MySimpleAppBucketName",
    });

    new cdk.CfnOutput(this, "MySimpleAppLambdaExport", {
      value: getPhotos.toString(),
      exportName: "MySimpleAppLambda",
    });

    new cdk.CfnOutput(this, "MySimpleAppApi", {
      value: httpApi.url!,
      exportName: "MySimpleAppAPIEndpoint",
    });
  }
}
