const validationSchemas = {
  createBlock: {
    properties: {
      name: { type: 'string', minLength: 1 },
      societyId: { format: 'uuid' },
    },
    required: ['name', 'societyId'],
    additionalProperties: false,
  },
  updateBlock: {
    properties: {
      id: { format: 'uuid' },
      name: { type: 'string', minLength: 1 },
      societyId: { format: 'uuid' },
    },
    required: ['id', 'name', 'societyId'],
    additionalProperties: false,
  },
  getBlocksBySocietyId: {
    properties: {
      societyId: { format: 'uuid' },
    },
    required: ['societyId'],
    additionalProperties: false,
  },
  enableOrDisableBlock: {
    properties: {
      id: { format: 'uuid' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export default validationSchemas;
