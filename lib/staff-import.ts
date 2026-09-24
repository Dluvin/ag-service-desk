import { normalizeHeader, parseCsv } from "./csv";
import { ROLES, SHOP_STAFF_ROLES, type Role } from "./roles";

export type ImportedStaff = {
  name: string;
  email: string;
  role: (typeof SHOP_STAFF_ROLES)[number];
  phone: string | null;
  password: string | null;
  revealVehicleNumber: string | null;
};

type Mapped = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  vehicle?: string;
  role?: string;
};

const HEADER_ALIASES: Record<string, keyof Mapped> = {
  name: "name",
  technician: "name",
  "tech name": "name",
  staff: "name",
  "first name": "firstName",
  first: "firstName",
  "last name": "lastName",
  last: "lastName",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  phone: "phone",
  mobile: "phone",
  cell: "phone",
  "cell phone": "phone",
  password: "password",
  "temp password": "password",
  vehicle: "vehicle",
  "vehicle number": "vehicle",
  "reveal vehicle": "vehicle",
  "reveal vehicle number": "vehicle",
  role: "role",
  title: "role",
  position: "role",
};

export function parseStaffRole(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  if (!v || v === "technician" || v === "tech" || v === "techs" || v === "service tech") {
    return ROLES.TECHNICIAN;
  }
  if (v === "manager" || v === "mgr" || v === "office manager") return ROLES.MANAGER;
  if (
    v === "clerical" ||
    v === "office" ||
    v === "office/clerical" ||
    v === "office clerical" ||
    v === "clerk"
  ) {
    return ROLES.CLERICAL;
  }
  if (v === "admin" || v === "administrator" || v === "company admin" || v === "owner") {
    return ROLES.ADMIN;
  }
  return null;
}

export function parseStaffImport(text: string): ImportedStaff[] {
  const rows = parseCsv(text.trim());
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const indexes = headers.map((header) => HEADER_ALIASES[header] ?? null);
  if (!indexes.includes("email") && !indexes.includes("name")) return [];

  const staff: ImportedStaff[] = [];
  for (const row of rows.slice(1)) {
    const raw: Mapped = {};
    indexes.forEach((field, i) => {
      if (!field) return;
      raw[field] = (row[i] ?? "").trim();
    });
    const name =
      (raw.name ?? "").trim() ||
      [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
    const email = (raw.email ?? "").trim().toLowerCase();
    const role = parseStaffRole(raw.role);
    if (!name || !email || !email.includes("@") || !role) continue;
    staff.push({
      name,
      email,
      role,
      phone: raw.phone?.trim() || null,
      password: raw.password?.trim() || null,
      revealVehicleNumber: role === ROLES.TECHNICIAN ? raw.vehicle?.trim() || null : null,
    });
  }
  return staff;
}

export function parseTechnicianImport(text: string) {
  return parseStaffImport(text).filter((row) => row.role === ROLES.TECHNICIAN);
}

export function isShopStaffRole(role: string): role is Role {
  return SHOP_STAFF_ROLES.includes(role as Role);
}
