import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorageOwner } from './access';
export default {
  getItem: (key: string) => AsyncStorage.getItem(`${key}:${getStorageOwner()}`),
  setItem: (key: string, value: string) => AsyncStorage.setItem(`${key}:${getStorageOwner()}`, value),
};
