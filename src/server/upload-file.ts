import { NextApiRequest, NextApiResponse } from "next";
import {
  STSClient,
  GetFederationTokenCommand,
  STSClientConfig,
} from "@aws-sdk/client-sts";
import { S3Config } from "../types";
import { getConfig, sanitizeKey, uuid } from "../utils";

const configInvariant = (envs: Record<string, any>): string[] => {
  return ["accessKeyId", "secretAccessKey", "bucket", "region"].filter(
    (key) => !envs[key] || envs.key === ""
  );
};

type NextRouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void>;

type MiddlewareFn = <T extends object = {}>(
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<T>;

type FactoryOptions = S3Config & {
  key?: (req: NextApiRequest, filename: string) => string | Promise<string>;
  middleware?: MiddlewareFn;
};

const resolveMiddleware =
  (req: NextApiRequest, res: NextApiResponse) =>
  async (middleware?: MiddlewareFn) => {
    const resp = middleware ? await middleware?.(req, res) : {};


    return resp || {}
  };

/** base path: pages/api/s3-uploader */
export const makeS3UploaderHandler = (
  options: FactoryOptions
): NextRouteHandler => {
  const routeHandler: NextRouteHandler = async (req, res) => {
    const config = getConfig();

    const missingEnvs = configInvariant(config);
    const filename = req.body.filename;

    if (!!missingEnvs.length) {
      res.status(500).json({
        error: `[S3UploadThing]: Missing Envs: ${missingEnvs.join(", ")}`,
      });
    }

    const middlewareParams = resolveMiddleware(req, res)(options.middleware);

    const key = options.key
      ? await Promise.resolve(options.key(req, filename))
      : `s3-uploadthing/${uuid()}/${sanitizeKey(filename)}`;

    const { bucket, region } = config;

    const stsConfig: STSClientConfig = {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region,
    };

    const policy = {
      Statement: [
        {
          Sid: "Stmt1S3UploadAssets",
          Effect: "Allow",
          Action: ["s3:PutObject"],
          Resource: [`arn:aws:s3:::${bucket}/${key}`],
        },
      ],
    };

    const sts = new STSClient(stsConfig);

    /** get federated token for upload */
    const command = new GetFederationTokenCommand({
      Name: "S3UploadWebToken",
      Policy: JSON.stringify(policy),
      DurationSeconds: 60 * 60, // 1 hour
    });

    const token = await sts.send(command);

    res.status(200).json({
      token,
      key,
      bucket,
      region,
      ...middlewareParams,
    });
  };

  return routeHandler;
};
