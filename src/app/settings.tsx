import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton, DialogProps, TextField, TabBar, Tab, Select, CircularProgress, Icon, Tooltip, Theme } from 'rmwc';
import { useGlobalState, createTTSID, getVoices, getProjects } from '../util';

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
  const [error, setError] = useState('');
  const abortLast = useRef<AbortController>();
  const needAPIKey = voiceID != initVoiceID || projectID != initProjectID || !initVoiceID || !initProjectID;

  useEffect(() => {
    if ((apiKey.length >= 24 || (apiKey.length && !apiKeyFocused)) && apiKey != infoLoadedKey) {
      setLoading(true);
      abortLast.current?.abort();
      const controller = new AbortController();
      abortLast.current = controller;
      Promise.all([getVoices(apiKey, controller.signal), getProjects(apiKey, controller.signal)]).then(([dlVoices, dlProjects]) => {
        const newVoices: typeof voices = {};
        const newProjects: typeof projects = {};
        for (const voice of dlVoices) newVoices[voice.id] = voice.name;
        for (const project of dlProjects) newProjects[project.id] = project.name;
        setVoices(newVoices);
        setProjects(newProjects);
        setError('');
      }, err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Invalid API token');
      }).finally(() => {
        setLoading(false);
        setInfoLoadedKey(apiKey);
      });
    } else if (!needAPIKey && !apiKey) {
      abortLast.current?.abort();
      setError('');
      setLoading(false);
      setInfoLoadedKey('');
      setProjects({ [initProjectID]: initProjectName });
      setVoices({ [initVoiceID]: initVoiceName });
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
        trailingIcon={loading ? <CircularProgress /> : error ? <Tooltip content={error}><Theme use="error"><Icon icon="error_outline" /></Theme></Tooltip> : infoLoadedKey == apiKey && apiKey.length ? <Theme use="secondary"><Icon icon="check_circle" /></Theme> : undefined}
      />
      <Select
        label="Project ID"
        disabled={Object.keys(projects).length <= 1}
        outlined
        enhanced
        required
        value={projectID}
        options={projects}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setProjectID(evt.currentTarget.value)}
        style={{ width: '100%' }}
      />
      <Select
        label="Voice ID"
        disabled={Object.keys(voices).length <= 1}
        outlined
        enhanced
        required
        value={voiceID}
        options={voices}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setVoiceID(evt.currentTarget.value)}
        style={{ width: '100%' }}
      />
    </>
  ];
  return <Dialog preventOutsideDismiss onClose={async evt => {
    if (evt.detail.action === 'accept') {
      setResemble({ voice: voices[voiceID], project: projects[projectID] });
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
      <DialogButton action="accept" isDefaultAction disabled={!username || !projectID || !voiceID || (needAPIKey && !apiKey) || apiKey != infoLoadedKey || !!error}>Save</DialogButton>
    </DialogActions>
  </Dialog>
};

export default Settings;