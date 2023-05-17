export type S3Config = {
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region?: string;
};

export type UploadResult = {
  url: string;
  bucket: string;
  key: string;
};

export type RequestOptions = {
  url?: string;
  body?: Record<string, any>;
  headers?: HeadersInit;
};

export type UploadToS3Options = {
  endpoint?: {
    request: RequestOptions;
  };
};

export type Uploader<P = any> = (
  file: File,
  params: P,
  eventHandlers: {
    onProgress: (uploaded: number) => void;
  }
) => Promise<UploadResult>;

export type UploadS3Params = {
  key: string;
  bucket: string;
  token: Record<string, any>;
  region: string;
};
