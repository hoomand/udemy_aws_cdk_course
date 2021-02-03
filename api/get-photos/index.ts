import {
  APIGatewayProxyEventV2,
  Context,
  APIGatewayProxyResultV2,
} from "aws-lambda";

async function getPhotos(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: "Hello from lambda, it is alive!",
  };
}

export { getPhotos };
