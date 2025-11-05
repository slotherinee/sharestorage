export type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};

export type MediaProcessingJob = {
  mediaId: string;
};
