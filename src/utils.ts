import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Config } from "./types";
import { v4 as uuidv4 } from "uuid";

export function getConfig(s3Config?: S3Config) {
  return {
    accessKeyId: s3Config?.accessKeyId ?? `${process.env.S3_UPLOAD_KEY}`,
    secretAccessKey:
      s3Config?.secretAccessKey ?? `${process.env.S3_UPLOAD_SECRET}`,
    bucket: s3Config?.bucket ?? `${process.env.S3_UPLOAD_BUCKET}`,
    region: s3Config?.region ?? `${process.env.S3_UPLOAD_REGION}`,
    
  };
}

export function getClient(s3Config?: S3Config) {
  const config = getConfig(s3Config);

  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    region: config.region,
  });
}

export const generateTemporaryUrl = async (
  key: string,
  s3Config?: S3Config
) => {
  const config = getConfig(s3Config);
  const client = getClient(s3Config);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: 3600 });

  return url;
};

export const uuid = () => uuidv4();

// eslint-disable-next-line unicorn/better-regex
const SAFE_CHARACTERS = /[^0-9a-zA-Z!_\\.\\*'\\(\\)\\\-/]/g;
export const sanitizeKey = (value: string) =>
  value.replace(SAFE_CHARACTERS, " ").replace(/\s+/g, "-");


export const getUrlForKey = (key: string) => `/api/s3-temporary-url?key=${key}`