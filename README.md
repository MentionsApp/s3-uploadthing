# S3-uploadthing

Simple utilities for uploading files to S3 using NextJS and Amazon STS federated tokens

## Setup

### Installation

```sh
npm i @mentionsapp/s3-uploadthing

# or

yarn add @mentionsapp/s3-uploadthing
```

### Environment variables

```sh
  S3_UPLOAD_KEY=##
  S3_UPLOAD_SECRET=##
  S3_UPLOAD_BUCKET=s3-bucket-example
  S3_UPLOAD_REGION=us-east-1
```

### Bucket setup

TODO


### STS Setup


First, let's generate API keys to grant your Next app AWS access.

Access the IAM section in AWS and create a new user with Programmatic access.

In the permissions step, choose "Attach existing policies directly" and click the "Create policy" button.

### Policy:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "STSToken",
      "Effect": "Allow",
      "Action": "sts:GetFederationToken",
      "Resource": ["arn:aws:sts::AMAZON_ACCOUNT_ID:federated-user/S3UploadWebToken"]
    },
    {
      "Sid": "S3UploadAssets",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::BUCKET_NAME",
        "arn:aws:s3:::BUCKET_NAME/*.jpg",
        "arn:aws:s3:::BUCKET_NAME/*.jpeg",
        "arn:aws:s3:::BUCKET_NAME/*.png",
        "arn:aws:s3:::BUCKET_NAME/*.gif",
      ]
    }
  ]
}
```

> Dont forget to replace `AMAZON_ACCOUNT_ID` and `BUCKET_NAME`


### Next API Route:

basic usage:

```ts
// pages/api/s3-uploader.ts
import { makeS3UploaderHandler } from "@mentionsapp/s3-uploadthing";

export makeS3UploaderHandler()
```


Overriding ENV config:

```ts
import { makeS3UploaderHandler } from "@mentionsapp/s3-uploadthing";

export default makeS3UploaderHandler({
  accessKeyId: '...',
  bucket: '...',
  secretAccessKey: '...',
  region: '...',
})
```


Overriding Key creation:

```ts
import { makeS3UploaderHandler } from "@mentionsapp/s3-uploadthing";

export default makeS3UploaderHandler({
  key(req, filename) {
    const userId = getSession(req);
    return `${userId}/${req.body.filePath}/${filename}`;
  },
});
```

Middleware usage:

```ts
export default makeS3UploaderHandler({
  middleware(req, res) {
    const user = await auth(req, res);

    if(!user) {
      return res.status(401)
    }
  },
});
```


### Client usage:

```tsx
import { uploadFile } from "@mentionsapp/s3-uploadthing";

export function UploadImage() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(undefined)
  const [progress, setProgress] = useState(0)

  const onPickFile = () => {
    inputRef.current.click();
  }

  const doUploadFile = async (file: File) => {
    setUploading(true)
    const result = await uploadFile(file, {
      eventHandlers: {
        onProgress: (uploaded) => {
          const loaded = file.size ? (uploaded / file.size) * 100 : 0;
          setProgress(loaded)
        },
      },
      endpoint: { // optional settings
        request: {
          url: '...', // if you want to customize the uploader URL.
          body: {
            userId: '...' // optional
          },
          headers: {
            'Authorization': "Bearer XXXXXX" // optional
          }
        }
      }
    });

    if(result) {
      const { url, bucket, key } = result

      setUploadResult({ url, bucket, key }) 
    }

    setUploading(false)
  }

  const onFile = (event) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      return;
    }

  }

  if(uploading) return <span> uploading </span>


  return (
    <input 
      type='file' 
      id='file' 
      ref={inputRef} 
      onChange={onFile} 
      style={{display: 'none'}}
    />

    <div>
      {
        !uploading && (
          <button onClick={onPickFile}>pick file</button>
        )
      }

      {
        !!uploadResult && (
          <img src={uploadResult.url} />
        )
      }
      
      {
        !!uploading && (
          <p>{progress} %</p>
        )
      }
    </div>
  )
}
```

### Generating temporary URL's for private uploads:

#### API Route:

```ts
// pages/api/s3-temporary-url.ts
export { GenerateTemporaryUrlHandler as default } from "@mentionsapp/s3-uploadthing";
```

#### On the client:

simply use `getUrlForKey` on html `<img />`:

```tsx
  import { getUrlForKey } from "@mentionsapp/s3-uploadthing";

  //...

  function Component() {
      // ...
    return <img src={getUrlForKey(key)} />
  }
```