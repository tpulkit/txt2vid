import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton, DialogProps, TextField, Typography, } from 'rmwc';
import { useGlobalState } from '../../util';

const Settings = (props: DialogProps) => {
  const [ttsID, setTTSID] = useGlobalState('ttsID');
  const [initProjectID, initVoiceID, encodedAPIKey] = ttsID.split('.');
  const [projectID, setProjectID] = useState(initProjectID);
  const [voiceID, setVoiceID] = useState(initVoiceID);
  const [username, setUsername] = useGlobalState('username');
  return <Dialog renderToPortal {...props}>
    <DialogTitle>Settings</DialogTitle>
    <DialogContent>
      <Typography use="subtitle1">Project ID</Typography>
      <TextField value={projectID} />
    </DialogContent>
    <DialogActions>
      <DialogButton action="close">Cancel</DialogButton>
      <DialogButton action="accept" isDefaultAction>Save</DialogButton>
    </DialogActions>
  </Dialog>
};

export default Settings;