import { useCallback, useMemo, useState } from 'react';
import {
  ROLE_STORAGE_KEY, RoleContext, roleById, readStoredRole, type RoleId,
} from './role';

/**
 * Holds the active role. Kept separate from the appearance provider because the
 * two have different lifetimes: appearance is a display preference the user
 * owns, the role is an access decision that a future backend would assert.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleId, setRoleId] = useState<RoleId>(() => readStoredRole());

  const setRoleIdPersisted = useCallback((id: RoleId) => {
    setRoleId(id);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(id));
    } catch {
      // Storage can be unavailable; the session keeps working either way.
    }
  }, []);

  const value = useMemo(
    () => ({ role: roleById(roleId), setRoleId: setRoleIdPersisted }),
    [roleId, setRoleIdPersisted],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
