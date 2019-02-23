import { PubSub } from './PubSub';
export { PubSub } from './PubSub';

if (!module.parent) {
  new PubSub().start();
}
