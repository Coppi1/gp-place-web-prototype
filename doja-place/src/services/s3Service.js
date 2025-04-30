import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
  },
});

export async function listApks(bucket, prefix) {
  const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const response = await s3Client.send(command);
  return response.Contents || [];
}

export async function generateDownloadUrl(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
