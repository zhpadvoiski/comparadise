import * as React from 'react';
import { useState, useContext } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material';
import { Error } from './Error';
import { Loader } from './Loader';
import { BaseImageStateContext, UpdateBaseImagesText } from '../providers/BaseImageStateProvider';
import { trpc } from '../utils/trpc';
import { StringParam, useQueryParams } from 'use-query-params';

const UPDATE_TEXT =
  'Doing so will update the base images in S3 and will set visual regression status to passed! You should only do this if you are about to merge your PR.';

export const UpdateImagesButton = () => {
  const [{ hash, bucket, repo, owner, baseImagesDirectory }] = useQueryParams({
    hash: StringParam,
    bucket: StringParam,
    repo: StringParam,
    owner: StringParam,
    baseImagesDirectory: StringParam
  });
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const { baseImageState, setBaseImageState } = useContext(BaseImageStateContext);

  const updateBaseImages = trpc.updateBaseImages.useMutation();
  const updateCommitStatus = trpc.updateCommitStatus.useMutation();

  if (!hash || !bucket || !repo || !owner) {
    return null;
  }

  const handleDialogOpen = () => {
    setDialogIsOpen(true);
  };

  const handleDialogClose = () => {
    setDialogIsOpen(false);
  };

  const handleUpdate = async () => {
    setBaseImageState?.(UpdateBaseImagesText.UPDATING);
    updateBaseImages.mutate({ hash, bucket, baseImagesDirectory });
    if (!baseImagesDirectory) {
      updateCommitStatus.mutate({ hash, owner, repo });
      setDialogIsOpen(false);
      setBaseImageState?.(UpdateBaseImagesText.UPDATED);
    }
  };

  const error = updateBaseImages.error || updateCommitStatus.error;
  if (error) {
    return <Error error={error} />;
  }

  const dialogContentText = baseImagesDirectory
    ? `Custom base image directory in use. This will update the base images in ${baseImagesDirectory}`
    : 'Are you sure you want to update the base images?';

  const baseImageUpdateStarted = baseImageState === UpdateBaseImagesText.UPDATING || baseImageState === UpdateBaseImagesText.UPDATED;

  return (
    <>
      <Button disabled={baseImageUpdateStarted} style={{ marginTop: '10px' }} variant="outlined" onClick={handleDialogOpen}>
        {baseImageState}
      </Button>
      {baseImagesDirectory && (
        <Box mt={2}>
          <Typography color="secondary" variant="h4">
            Custom base image directory {baseImagesDirectory} in use
          </Typography>
        </Box>
      )}
      {baseImageState === UpdateBaseImagesText.UPDATING ? (
        <Dialog open={dialogIsOpen}>
          <div style={{ height: '150px', margin: '150px' }}>
            <Loader />
          </div>
        </Dialog>
      ) : (
        <Dialog onClose={handleDialogClose} open={dialogIsOpen}>
          <DialogTitle>{dialogContentText}</DialogTitle>
          <DialogContent>
            <DialogContentText>{!baseImagesDirectory && UPDATE_TEXT}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" autoFocus onClick={handleUpdate}>
              Update
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleDialogClose}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default UpdateImagesButton;
