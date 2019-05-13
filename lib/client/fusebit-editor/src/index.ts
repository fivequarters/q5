import './fusebit-light.css';
import './fusebit-dark.css';

import { dom, library } from '@fortawesome/fontawesome-svg-core';
import {
  faCheckCircle,
  faFileCode as farFileCode,
  faMinusSquare,
  faPlusSquare as farPlusSquare,
  faTimesCircle,
} from '@fortawesome/free-regular-svg-icons';
import {
  faArrowsAlt,
  faChevronDown,
  faChevronRight,
  faCogs,
  faCompress,
  faFile,
  faFileCode,
  faPlay,
  faPlus,
  faSave,
  faTrash,
  faUserSecret,
  faWindowClose,
  faClock,
  faTools,
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faTools,
  faClock,
  faSave,
  faPlay,
  faArrowsAlt,
  faCompress,
  faFileCode,
  farFileCode,
  faWindowClose,
  farPlusSquare,
  faMinusSquare,
  faCheckCircle,
  faTimesCircle,
  faChevronRight,
  faChevronDown,
  faPlus,
  faFile,
  faTrash,
  faCogs,
  faUserSecret
);
dom.watch();

// Work around issues related to loading Monaco workers cross-domain when the Fusebit editor
// is hosted on CDN. This is based on Option 1 from
// https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-amd-cross.md
//@ts-ignore
window.MonacoEnvironment = {
  getWorkerUrl: function(workerId: string, label: string) {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.15.6/min/'
      };
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.15.6/min/vs/base/worker/workerMain.js');`)}`;
  },
};

export const version = require('../package.json').version;
export * from './Server';
export * from './Events';
export * from './EditorContext';
export * from './CreateEditor';

// export * from './CreateActionPanel';
// export * from './CreateNavigationPanel';
// export * from './CreateEditorPanel';
// export * from './CreateLogsPanel';
// export * from './CreateStatusPanel';
