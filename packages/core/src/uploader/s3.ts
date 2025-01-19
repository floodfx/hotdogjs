import crypto from "crypto";
// adapted from: https://gist.github.com/chrismccord/37862f1f8b1f5148644b75d20d1cb073
// TODO port over to use Bun's S3 API https://bun.sh/docs/api/s3

export interface SignFormUploadOptions {
  bucket: string;
  key: string;
  acl: string;
  maxFileSize: number;
  contentType: string;
  expiresSeconds: number;
  region: string;
}

export interface SignFormUpload {
  key: string;
  acl: string;
  "content-type": string;
  policy: string;
  "x-amz-signature": string;
  "x-amz-credential": string;
  "x-amz-date": string;
  "x-amz-server-side-encryption": "AES256";
  "x-amz-algorithm": "AWS4-HMAC-SHA256";
}

export async function S3SignFormUpload(opts: SignFormUploadOptions): Promise<SignFormUpload> {
  const cred = credential();
  const date = amzDate();
  const expiresAt = new Date(Date.now() + opts.expiresSeconds * 1000);
  const encodedPolicy = Buffer.from(
    JSON.stringify({
      expiration: expiresAt.toISOString(),
      conditions: [
        { bucket: opts.bucket },
        ["eq", "$key", opts.key],
        { acl: opts.acl },
        ["eq", "$Content-Type", opts.contentType],
        ["content-length-range", 0, opts.maxFileSize],
        { "x-amz-server-side-encryption": "AES256" },
        { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
        { "x-amz-credential": cred },
        { "x-amz-date": date },
      ],
    })
  ).toString("base64");

  return {
    key: opts.key,
    acl: "public-read",
    "content-type": opts.contentType,
    policy: encodedPolicy,
    "x-amz-credential": cred,
    "x-amz-date": date,
    "x-amz-server-side-encryption": "AES256",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-signature": signature(expiresAt, encodedPolicy),
  } as SignFormUpload;
}

function credential() {
  return `${process.env.AWS_ACCESS_KEY_ID}/${shortDate(new Date())}/${process.env.AWS_REGION}/s3/aws4_request`;
}

function amzDate() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "") + "Z";
}

function signature(expiresAt: Date, encodedPolicy: string): string {
  // console.log("expiresAt", expiresAt, "encodedPolicy", encodedPolicy);
  const signingKey = generateSigningKey(expiresAt, "s3");
  const hash = sha256(signingKey, encodedPolicy);
  return hash.toString("hex").toLowerCase();
}

function generateSigningKey(expiresAt: Date, service: string): Buffer {
  const amzDate = shortDate(expiresAt);
  const region = process.env.AWS_REGION!;
  const secret = process.env.AWS_SECRET_ACCESS_KEY!;

  // console.log("amzDate", amzDate, "region", region, "service", service);

  return sha256(sha256(sha256(sha256(`AWS4${secret}`, amzDate), region), service), "aws4_request");
}

function shortDate(expiresAt: Date): string {
  const amzDate = amzDateFormat(expiresAt);
  return amzDate.slice(0, 8);
}

function amzDateFormat(date: Date): string {
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}T000000Z`;
}

function sha256(secret: string | Buffer, msg: string): Buffer {
  return crypto.createHmac("sha256", secret).update(msg).digest();
}
