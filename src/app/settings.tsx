import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton, DialogProps, TextField, TabBar, Tab, Select, CircularProgress, Icon, Tooltip, Theme, Typography, Button, Checkbox } from 'rmwc';
import { useGlobalState, createTTSID, getVoices, getProjects, MIN_FPS } from '../util';
import { expectedTime, mlType, rerunProfiles, setMLType } from '../util/ml';

declare let OffscreenCanvas: unknown;
const Settings = ({ onClose, ...props }: DialogProps) => {
  const [ttsID, setTTSID] = useGlobalState('ttsID');
  const location = useLocation();
  const [time, setTime] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [initProjectID = '', initVoiceID = ''] = ttsID.split('.');
  const [{ project: initProjectName, voice: initVoiceName }, setResemble] = useGlobalState('resemble');
  const [av, setAV] = useGlobalState('av');
  const [useCPU, setUseCPU] = useState(mlType == 'cpu' || mlType == 'hybrid');
  const [useGPU, setUseGPU] = useState(mlType == 'gpu' || mlType == 'hybrid');
  const resultType = useCPU ? useGPU ? 'hybrid' : 'cpu' : 'gpu';
  const [localAV, setLocalAV] = useState(av);
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
  const [cams, setCams] = useState<Record<string, string>>({});
  const [mics, setMics] = useState<Record<string, string>>({});
  const [camState, setCamState] = useState<boolean | string>(false);
  const abortLast = useRef<AbortController>();
  const needAPIKey = voiceID != initVoiceID || projectID != initProjectID || !initVoiceID || !initProjectID;

  useEffect(() => {
    expectedTime().then(time => {
      setLoadingProfile(false);
      setTime(time);
    });
  }, []);

  useEffect(() => {
    if (!Object.keys(cams).length || !Object.keys(mics).length) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const newMics: typeof mics = {};
        const newCams: typeof cams = {};
        newCams['default'] = 'Same as system';
        newMics['default'] = 'Same as system';
        for (const device of devices) {
          if (device.deviceId) {
            if (['default', 'communications'].includes(device.deviceId)) continue;
            if (device.kind == 'audioinput') newMics[device.deviceId] = device.label;
            if (device.kind == 'videoinput') newCams[device.deviceId] = device.label;
          }
        }
        if (Math.min(Object.keys(newCams).length, Object.keys(newMics).length) > 1) {
          if (!localAV.cam) setLocalAV(localAV => ({ cam: 'default', mic: localAV.mic }));
          if (!localAV.mic) setLocalAV(localAV => ({ cam: localAV.cam, mic: 'default' }));
          setMics(newMics);
          setCams(newCams);
          setCamState(true);
        } else {
          setCamState("Couldn't find any devices. Have you granted webcam access to the app?");
        }
      });
    }
  }, [cams, mics]);

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
        style={{ width: '100%' }}
      />
      <Checkbox label="Use CPU" checked={useCPU} disabled={typeof OffscreenCanvas == 'undefined'} onChange={(evt: React.FormEvent<HTMLInputElement>) => {
        setUseCPU(evt.currentTarget.checked);
        if (!evt.currentTarget.checked) setUseGPU(true);
      }} />
      <Checkbox label="Use GPU" checked={useGPU} disabled={typeof OffscreenCanvas == 'undefined'} onChange={(evt: React.FormEvent<HTMLInputElement>) => {
        setUseGPU(evt.currentTarget.checked);
        if (!evt.currentTarget.checked) setUseCPU(true);
      }} />
      <Typography use="body1">Execution mode: {(resultType == 'cpu' ? 'CPU' : resultType == 'gpu' ? 'GPU' : 'CPU + GPU (experimental)') + (resultType != mlType ? ' (reload required)' : '')}</Typography>
      <Button
        raised
        label={`Benchmark${!loadingProfile ? ` (${time <= 1000 / MIN_FPS ? (1000 / time).toFixed(1) + ' FPS' : `${MIN_FPS} FPS delayed`})` : ''}`}
        disabled={loadingProfile || /\/call\/([^\/]+)$/.test(location.pathname)}
        trailingIcon={loadingProfile ? <CircularProgress /> : undefined}
        onClick={() => {
          setLoadingProfile(true);
          rerunProfiles().then(newTime => {
            setTime(newTime);
            setLoadingProfile(false);
          });
        }}
        style={{ width: '100%' }}
      />
    </>,
    <>
      {typeof camState == 'string' && <Typography use="body1" style={{ textAlign: 'center' }}>{camState}</Typography>}
      <Select
        label="Camera"
        disabled={!Object.keys(cams).length}
        outlined
        enhanced
        required
        value={Object.keys(cams).length ? localAV.cam : ''}
        options={cams}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setLocalAV(av => ({ cam: evt.currentTarget.value, mic: av.mic }))}
        style={{ width: '100%' }}
        rootProps={{ style: { width: '100%' } }}
      />
      <Select
        label="Microphone"
        disabled={!Object.keys(mics).length}
        outlined
        enhanced
        required
        value={Object.keys(mics).length ? localAV.mic : ''}
        options={mics}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setLocalAV(av => ({ mic: evt.currentTarget.value, cam: av.cam }))}
        style={{ width: '100%' }}
        rootProps={{ style: { width: '100%' } }}
      />
      <Button raised label="Request camera access" onClick={() => {
        setCamState(false);
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
          for (const track of stream.getTracks()) track.stop();
          setMics({});
          setCams({});
        }, () => {
          setCamState('Camera access denied. Please update your browser settings.');
        });
      }}
        trailingIcon={camState ? camState === true ? <Theme use="secondary">check_circle</Theme> : <Theme use="error">error_outline</Theme> : <CircularProgress theme="error" />}
        style={{ alignSelf: 'center' }}
      />
    </>,
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
        trailingIcon={loading ? <CircularProgress /> : error ? <Tooltip content={error}><Theme use="error">error_outline</Theme></Tooltip> : infoLoadedKey == apiKey && apiKey.length ? <Theme use="secondary">check_circle</Theme> : undefined}
        style={{ width: '100%' }}
      />
      <Select
        label="Project ID"
        disabled={!infoLoadedKey || !Object.keys(projects).length}
        outlined
        enhanced
        required
        value={projectID}
        options={projects}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setProjectID(evt.currentTarget.value)}
        style={{ width: '100%' }}
        rootProps={{ style: { width: '100%' } }}
      />
      <Select
        label="Voice ID"
        disabled={!infoLoadedKey || !Object.keys(voices).length}
        outlined
        enhanced
        required
        value={voiceID}
        options={voices}
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => setVoiceID(evt.currentTarget.value)}
        style={{ width: '100%' }}
        rootProps={{ style: { width: '100%' } }}
      />
    </>
  ];
  return <Dialog preventOutsideDismiss onClose={async evt => {
    if (evt.detail.action === 'accept') {
      setResemble({ voice: voices[voiceID], project: projects[projectID] });
      setAV(localAV);
      if (needAPIKey || apiKey != '') {
        setTTSID(await createTTSID(projectID, voiceID, apiKey));
      }
      setGlobalUsername(username);
      setMLType(resultType);
    }
    onClose?.(evt);
  }} {...props}>
    <DialogTitle theme="onSurface">Settings</DialogTitle>
    <TabBar activeTabIndex={menu} onActivate={evt => setMenu(evt.detail.index)}>
      <Tab>General</Tab>
      <Tab>Audio/Video</Tab>
      <Tab>resemble.ai</Tab>
    </TabBar>
    {contents.map((el, i) => (
      <DialogContent
        key={i}
        style={{ display: menu == i ? 'flex' : 'none', flexDirection: 'column', minHeight: '18rem', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', overflow: 'visible' }}
        theme="onSurface"
      >
        {el}
      </DialogContent>
    ))}
    <DialogActions>
      <DialogButton action="close" disabled={!initUsername || !ttsID}>Cancel</DialogButton>
      <DialogButton action="accept" isDefaultAction disabled={!username || !projectID || !voiceID || (needAPIKey && !apiKey) || apiKey != infoLoadedKey || !!error}>Save</DialogButton>
    </DialogActions>
  </Dialog>
};

export default Settings;