import { createDialogQueue, createSnackbarQueue } from 'rmwc';

const { alert, confirm, prompt, dialogs } = createDialogQueue();
const { messages, clearAll: clearAllMessages, notify } = createSnackbarQueue();

export { alert, confirm, prompt, notify, clearAllMessages, dialogs, messages };
