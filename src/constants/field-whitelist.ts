// Basic fields that are always accessible
export const BASIC_FIELDS = ['_id', 'name', 'email', 'age', 'phone', 'createdAt', 'updatedAt'];

// Additional fields for admin preset
export const ADMIN_FIELDS = [...BASIC_FIELDS, 'emailLower', 'isDeleted', 'deletedAt'];

// All allowed fields for custom projection
export const ALLOWED_FIELDS = [...ADMIN_FIELDS];

// Fields that are always hidden unless explicitly requested
export const HIDDEN_FIELDS = ['__v', 'isDeleted', 'deletedAt'];

// Preset projections
export const FIELD_PRESETS = {
  basic: BASIC_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}),
  admin: ADMIN_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}),
};