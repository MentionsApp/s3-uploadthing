import {
  CompleteMultipartUploadCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import {
  RequestOptions,
  Uploader,
  UploadS3Params,
  UploadToS3Options,
} from "../types";

const getClient = (token: Record<string, any>, region: string) => {
  return new S3Client({
    credentials: {
      accessKeyId: token.Credentials.AccessKeyId,
      secretAccessKey: token.Credentials.SecretAccessKey,
      sessionToken: token.Credentials.SessionToken,
    },
    region: region,
  });
};

export const uploadPreflight = async (
  file: File,
  requestOptions?: RequestOptions
): Promise<UploadS3Params & { error?: string }> => {
  const additionalBody = requestOptions?.body ?? {};
  const additionalHeaders = requestOptions?.headers ?? {};
  const apiRouteUrl = requestOptions?.url ?? "/api/s3-uploader";

  const body = {
    filename: file.name,
    filetype: file.type,
    ...additionalBody,
  };

  const headers = {
    ...additionalHeaders,
    "Content-Type": "application/json",
  };

  const res = await fetch(apiRouteUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return await res.json();
};

const uploadWithS3SDK: Uploader<UploadS3Params> = async (
  file,
  params,
  eventHandlers
) => {
  let { key, bucket, token, region } = params;

  const client = getClient(token, region);

  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: file,
    CacheControl: "max-age=630720000, public",
    ContentType: file.type,
  };

  const s3Upload = new Upload({
    client,
    params: uploadParams,
  });

  s3Upload.on("httpUploadProgress", (progress) => {
    const uploaded = progress.loaded ?? 0;
    eventHandlers?.onProgress?.(uploaded);
  });

  const uploadResult =
    (await s3Upload.done()) as CompleteMultipartUploadCommandOutput;

  const url =
    uploadResult.Bucket && uploadResult.Key
      ? `https://${uploadResult.Bucket}.s3.${region}.amazonaws.com/${uploadResult.Key}`
      : "";

  return {
    url,
    bucket: uploadResult.Bucket ?? "",
    key: uploadResult.Key ?? "",
  };
};

export const uploadFile = async (
  file: File,
  options: UploadToS3Options & {
    eventHandlers: {
      onProgress: (uploaded: number) => void;
    };
  }
) => {
  const { eventHandlers, ...rest } = options;

  const params = await uploadPreflight(file, rest.endpoint?.request);

  if (params.error) {
    console.error(params.error);
    throw params.error;
  }

  const result = await uploadWithS3SDK(file, params, {
    onProgress: (uploaded) => {
      eventHandlers?.onProgress?.(uploaded);
    },
  });

  return result;
};
