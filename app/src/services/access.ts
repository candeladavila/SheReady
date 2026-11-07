let token: string | null = null;
let owner = 'guest';
export const getAccessToken = () => token;
export const getStorageOwner = () => owner;
export function setAccess(value: string | null, userId = 'guest') { token = value; owner = userId; }
