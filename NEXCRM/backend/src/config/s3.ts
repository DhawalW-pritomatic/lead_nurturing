import { S3Client } from '@aws-sdk/client-s3';

// When running on EC2 with an IAM role, omit credentials entirely so the SDK
// uses the instance metadata service (IMDSv2) credential provider automatically.
// When running locally, set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env.
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(credentials ? { credentials } : {}),
});

export const S3_BUCKET = process.env.S3_BUCKET || 'nexcrm-assets-dummy';
