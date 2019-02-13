// import Workspace from './Workspace';

import './q5.css';

import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { faSave, faPlay, faArrowsAlt, faCompress, faFileCode, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import {
  faFileCode as farFileCode,
  faPlusSquare as farPlusSquare,
  faMinusSquare,
  faCheckCircle,
  faTimesCircle,
} from '@fortawesome/free-regular-svg-icons';

library.add(
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
  faTimesCircle
);
dom.watch();

export * from './Server';
export * from './Events';
export * from './Workspace';
export * from './CreateEditor';
export * from './CreateActionPanel';
export * from './CreateNavigationPanel';
export * from './CreateEditorPanel';
export * from './CreateLogsPanel';
export * from './CreateStatusPanel';
