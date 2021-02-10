import { BlockPublicAccess, Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { Runtime } from "@aws-cdk/aws-lambda";
import * as path from "path";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
} from "@aws-cdk/aws-cloudfront";

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

    const websiteBucket = new Bucket(this, "MySimpleAppWebsiteBucket", {
      websiteIndexDocument: "index.html",
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
    });

    new BucketDeployment(this, "MySimpleAppWebsiteDeployed", {
      sources: [Source.asset(path.join(__dirname, "..", "frontend", "build"))],
      destinationBucket: websiteBucket,
    });

    const oia = new OriginAccessIdentity(this, "OIA", {
      comment: "Created by CDK",
    });
    websiteBucket.grantRead(oia);

    const cloudFront = new CloudFrontWebDistribution(
      this,
      "MySimpleAppDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: websiteBucket,
              originAccessIdentity: oia,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
      }
    );

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

    new cdk.CfnOutput(this, "MySimpleAppWebsiteBucketNameExport", {
      value: websiteBucket.bucketName,
      exportName: "MySimpleAppWebsiteBucketName",
    });

    new cdk.CfnOutput(this, "MySimpleAppWebsiteURL", {
      value: cloudFront.distributionDomainName,
      exportName: "MySimpleAppWebsiteURL",
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
