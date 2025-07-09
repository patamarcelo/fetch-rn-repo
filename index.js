import { registerRootComponent } from 'expo';

import 'array-flat-polyfill';              // para flat e flatMap
import 'core-js/features/array/includes';  // para includes
import 'core-js/features/array/at';        // para at()

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
