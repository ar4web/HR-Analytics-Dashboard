/**
 * Role and permission layer.
 *
 * This is not a cosmetic role picker. A demo that shows every column to every
 * viewer teaches the wrong habit, and salary plus national-ID data is exactly
 * what an HR system is audited on. Each capability below therefore maps to a
 * real gate in the UI: `viewSalaries` masks the pay columns, `viewPII` masks
 * identifiers, `viewPayroll`/`viewCompliance` replace those modules with a
 * restricted state, and `exportData` disables the export action.
 *
 * Kept in a plain module (no components) because the React Fast Refresh lint
 * rule forbids a file that exports a component from also exporting hooks or
 * constants — the same split `theme/appearance.ts` uses.
 */
import { createContext, useContext } from 'react';

export type RoleId = 'hr_admin' | 'manager' | 'finance' | 'auditor';

export interface RoleCapabilities {
  /** Monthly/annual pay figures: salaries, payroll cost, bands, compa-ratio. */
  viewSalaries: boolean;
  /** Identifiers and personal documents: national ID, iqama, passport, permit. */
  viewPII: boolean;
  /** The payroll module, including its run history. */
  viewPayroll: boolean;
  /** The compliance module, including the document queue. */
  viewCompliance: boolean;
  /** Absence reasons and health-adjacent leave. */
  viewMedical: boolean;
  /** Whether the export action is available at all. */
  exportData: boolean;
  /** Editing targets and configuration, as opposed to reading them. */
  editConfig: boolean;
}

export interface Role {
  id: RoleId;
  label: string;
  labelAr: string;
  /** One line for the switcher describing what the role may see. */
  summary: string;
  can: RoleCapabilities;
}

/**
 * Capability matrix. The principle is least privilege with a stated reason:
 * a line manager needs their team's headcount and Saudization position, not
 * their salaries; finance needs cost, not civil IDs.
 */
export const ROLES: Role[] = [
  {
    id: 'hr_admin',
    label: 'HR Admin',
    labelAr: 'مدير الموارد البشرية',
    summary: 'Full access — records, pay, compliance, exports',
    can: {
      viewSalaries: true,
      viewPII: true,
      viewPayroll: true,
      viewCompliance: true,
      viewMedical: true,
      exportData: true,
      editConfig: true,
    },
  },
  {
    id: 'manager',
    label: 'Line Manager',
    labelAr: 'مدير إدارة',
    summary: 'Team records and Saudization; pay figures masked',
    can: {
      viewSalaries: false,
      viewPII: false,
      viewPayroll: false,
      viewCompliance: true,
      viewMedical: false,
      exportData: false,
      editConfig: false,
    },
  },
  {
    id: 'finance',
    label: 'Finance',
    labelAr: 'المالية',
    summary: 'Payroll cost and budgets; identifiers masked',
    can: {
      viewSalaries: true,
      viewPII: false,
      viewPayroll: true,
      viewCompliance: true,
      viewMedical: false,
      exportData: true,
      editConfig: false,
    },
  },
  {
    id: 'auditor',
    label: 'Auditor',
    labelAr: 'المراجع',
    summary: 'Read-only across records and compliance; no medical leave',
    can: {
      viewSalaries: true,
      viewPII: true,
      viewPayroll: true,
      viewCompliance: true,
      viewMedical: false,
      exportData: true,
      editConfig: false,
    },
  },
];

export const DEFAULT_ROLE: RoleId = 'hr_admin';
export const ROLE_STORAGE_KEY = 'hr-dash:role';

const ROLE_IDS: RoleId[] = ROLES.map((role) => role.id);

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === 'string' && (ROLE_IDS as string[]).includes(value);
}

/** Reads the stored role, falling back to the default when absent or invalid. */
export function readStoredRole(): RoleId {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    if (raw === null) return DEFAULT_ROLE;
    const parsed: unknown = JSON.parse(raw);
    return isRoleId(parsed) ? parsed : DEFAULT_ROLE;
  } catch {
    // Private mode, disabled storage, or hand-edited value: never throw for a
    // preference. Falling back to the default keeps the app usable.
    return DEFAULT_ROLE;
  }
}

export function roleById(id: RoleId): Role {
  return ROLES.find((role) => role.id === id) ?? ROLES[0];
}

export interface RoleContextValue {
  role: Role;
  setRoleId: (id: RoleId) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole(): RoleContextValue {
  const value = useContext(RoleContext);
  if (value === null) throw new Error('useRole must be used inside <RoleProvider>');
  return value;
}

/** Convenience for the many `role.can.x` reads. */
export function useCan(): RoleCapabilities {
  return useRole().role.can;
}
