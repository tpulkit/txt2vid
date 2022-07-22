import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton, DialogProps, TextField, TabBar, Tab, Select, CircularProgress } from 'rmwc';
import { useGlobalState, createTTSID } from '../util';
import './dialog.css';

const Settings = ({ onClose, ...props }: DialogProps) => {
  const [ttsID, setTTSID] = useGlobalState('ttsID');
  const [initProjectID = '', initVoiceID = ''] = ttsID.split('.');
  const [{ project: initProjectName, voice: initVoiceName }, setResemble] = useGlobalState('resemble');
  const [projectID, setProjectID] = useState(initProjectID);
  const [voiceID, setVoiceID] = useState(initVoiceID);
  const [apiKey, setAPIKey] = useState('');
  const [infoLoadedKey, setInfoLoadedKey] = useState('');
  const [initUsername, setGlobalUsername] = useGlobalState('username');
  const [username, setUsername] = useState(initUsername);
  const [apiKeyFocused, setAPIKeyFocused] = useState(false);
  const [menu, setMenu] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Record<string, string>>({ [initProjectID]: initProjectName });
  const [voices, setVoices] = useState<Record<string, string>>({ [initVoiceID]: initVoiceName });
  const needAPIKey = voiceID != initVoiceID || projectID != initProjectID || !initVoiceID || !initProjectID;

  useEffect(() => {
    if (apiKey.length >= 24 || (apiKey.length && !apiKeyFocused)) {
      setLoading(true);
      
      setLoading(false);
    }
  }, [apiKey, apiKeyFocused]);

  let contents: React.ReactNode[] = [
    <>
      <TextField
        label="Username"
        value={username}
        required
        outlined
        onChange={(evt: React.FormEvent<HTMLInputElement>) => setUsername(evt.currentTarget.value)}
      />
    </>,
    <></>,
    <>
      <TextField
        label={needAPIKey ? 'API Key' : 'API Key (optional)'}
        type="password"
        value={!needAPIKey && !apiKey && !apiKeyFocused ? '•'.repeat(24) : apiKey}
        required={needAPIKey}
        outlined
        onFocus={() => setAPIKeyFocused(true)}
        onBlur={() => setAPIKeyFocused(false)}
        onChange={(evt: React.FormEvent<HTMLInputElement>) => setAPIKey(evt.currentTarget.value)}
        trailingIcon={loading ? <CircularProgress /> : undefined}
      />
      {/* <TextField
        label="Project ID"
        value={projectID}
        required
        outlined
        onChange={(evt: React.FormEvent<HTMLInputElement>) => setProjectID(evt.currentTarget.value)}
      /> */}
      <Select
        label="Project ID"
        disabled={projects.length <= 1}
        outlined
        enhanced
        required
        value={projectID}
        options={projects}
        style={{ width: '100%' }}
      />
      <Select
        label="Voice ID"
        disabled={voices.length <= 1}
        outlined
        enhanced
        required
        value={voiceID}
        options={voices}
        style={{ width: '100%' }}
      />

      {/* <TextField
        label="Voice ID"
        value={voiceID}
        required
        outlined
        onChange={(evt: React.FormEvent<HTMLInputElement>) => setVoiceID(evt.currentTarget.value)}
      /> */}
    </>
  ];
  return <Dialog preventOutsideDismiss onClose={async evt => {
    if (evt.detail.action === 'accept') {
      if (needAPIKey || apiKey != '') {
        setTTSID(await createTTSID(projectID, voiceID, apiKey));
      }
      setGlobalUsername(username);
    }
    onClose?.(evt);
  }} {...props}>
    <DialogTitle theme="onSurface">Settings</DialogTitle>
    <TabBar activeTabIndex={menu} onActivate={evt => setMenu(evt.detail.index)}>
      <Tab>General</Tab>
      <Tab>Audio/Video</Tab>
      <Tab>resemble.ai</Tab>
    </TabBar>
    <DialogContent style={{ display: 'flex', flexDirection: 'column', minHeight: '18rem', justifyContent: 'space-between', flexWrap: 'wrap', overflow: 'visible' }}>
      {contents[menu]}
    </DialogContent>
    <DialogActions>
      <DialogButton action="close" disabled={!initUsername || !ttsID}>Cancel</DialogButton>
      <DialogButton action="accept" isDefaultAction disabled={!username || !projectID || !voiceID || (needAPIKey && !apiKey)}>Save</DialogButton>
    </DialogActions>
  </Dialog>
};

export default Settings;