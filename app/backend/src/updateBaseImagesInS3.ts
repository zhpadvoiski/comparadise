import { S3Client } from './s3Client';
import {
  BASE_IMAGE_NAME,
  BASE_IMAGES_DIRECTORY,
  NEW_IMAGE_NAME,
  UPDATE_BASE_IMAGES_ERROR_MESSAGE,
} from 'shared';
import { shouldAllowBaseImageUpdate } from './shouldAllowBaseImageUpdate';
import { TRPCError } from '@trpc/server';
import { UpdateBaseImagesInput } from './schema';
import { getKeysFromS3 } from './getKeysFromS3';

export const updateBaseImagesInS3 = async ({
  hash,
  bucket,
  owner,
  repo,
}: UpdateBaseImagesInput) => {
  if (!(await shouldAllowBaseImageUpdate(owner, repo, hash))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: UPDATE_BASE_IMAGES_ERROR_MESSAGE,
    });
  }
  const s3Paths = await getKeysFromS3(hash, bucket);
  return await replaceImagesInS3(s3Paths, bucket);
};

export const filterNewImages = (s3Paths: string[]) => {
  return s3Paths.filter(path =>
    path.match(new RegExp(`/${NEW_IMAGE_NAME}.png`))
  );
};

export const getBaseImagePaths = (newImagePaths: string[]) => {
  return newImagePaths.map(path => {
    const commitHash = path.split('/')[0];
    return path
      .replace(commitHash, BASE_IMAGES_DIRECTORY)
      .replace(NEW_IMAGE_NAME, BASE_IMAGE_NAME);
  });
};

export const replaceImagesInS3 = async (s3Paths: string[], bucket: string) => {
  const newImagePaths = filterNewImages(s3Paths);
  const baseImagePaths = getBaseImagePaths(newImagePaths);
  return await Promise.all(
    baseImagePaths.map((path, index) =>
      S3Client.copyObject({
        Bucket: bucket,
        CopySource: `${bucket}/${newImagePaths[index]}`,
        Key: path,
        ACL: 'bucket-owner-full-control',
      })
    )
  );
};
