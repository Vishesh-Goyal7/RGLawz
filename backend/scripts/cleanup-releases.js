/**
 * Keeps only the 2 newest versioned releases in the S3 releases folder.
 * Run automatically after electron:publish:mac.
 *
 * Retention rule: latest-mac.yml is always kept. DMG + blockmap files for
 * every version older than the 2 newest semver versions are deleted.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const BUCKET = process.env.AWS_S3_BUCKET || "rglawz";
const PREFIX = "releases/";
const VERSIONS_TO_KEEP = 2;

const client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function parseVersion(key) {
  const match = key.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

async function listAllObjects() {
  const objects = [];
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      })
    );
    (res.Contents || []).forEach((obj) => objects.push(obj.Key));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function main() {
  console.log(`\nCleaning up S3 releases (keeping ${VERSIONS_TO_KEEP} newest)…`);

  const allKeys = await listAllObjects();

  // Collect unique versions found in the bucket
  const versionSet = new Set();
  allKeys.forEach((key) => {
    const v = parseVersion(key);
    if (v) versionSet.add(v);
  });

  const sortedVersions = [...versionSet].sort(compareVersions);
  const keepVersions = new Set(sortedVersions.slice(-VERSIONS_TO_KEEP));

  console.log(`Found versions: ${sortedVersions.join(", ")}`);
  console.log(`Keeping: ${[...keepVersions].join(", ")}`);

  // Keys to delete: versioned files not in keepVersions
  // Always preserve latest-mac.yml and any non-versioned metadata files
  const toDelete = allKeys.filter((key) => {
    const v = parseVersion(key);
    if (!v) return false; // keep non-versioned files (e.g. latest-mac.yml)
    return !keepVersions.has(v);
  });

  if (toDelete.length === 0) {
    console.log("Nothing to delete.\n");
    return;
  }

  console.log(`Deleting ${toDelete.length} file(s):`);
  toDelete.forEach((k) => console.log(`  - ${k}`));

  await client.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: toDelete.map((Key) => ({ Key })),
        Quiet: true,
      },
    })
  );

  console.log("Done.\n");
}

main().catch((err) => {
  console.error("cleanup-releases failed:", err.message);
  process.exit(1);
});
