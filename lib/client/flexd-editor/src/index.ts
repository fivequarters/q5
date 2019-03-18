import './flexd.css';

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

export * from './Server';
export * from './Events';
export * from './EditorContext';
export * from './CreateEditor';
// export * from './CreateActionPanel';
// export * from './CreateNavigationPanel';
// export * from './CreateEditorPanel';
// export * from './CreateLogsPanel';
// export * from './CreateStatusPanel';
