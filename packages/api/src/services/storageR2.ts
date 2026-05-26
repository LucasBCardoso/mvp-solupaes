import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, isStorageConfigured } from '../lib/env.js';

let _client: S3Client | null = null;

function client(): S3Client {
  if (!isStorageConfigured) {
    throw new Error('Storage R2 não configurado — defina R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET');
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

export async function presignFacadeUpload(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.R2_BUCKET!,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn: opts.expiresInSeconds ?? 300 });
}

export async function presignFacadeDownload(key: string, expiresInSeconds = 3600): Promise<string> {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  const cmd = new GetObjectCommand({
    Bucket: env.R2_BUCKET!,
    Key: key,
  });
  return getSignedUrl(client(), cmd, { expiresIn: expiresInSeconds });
}

export function facadeKey(clientUuid: string, ext = 'jpg'): string {
  const ts = Date.now();
  return `facades/${clientUuid}-${ts}.${ext}`;
}
